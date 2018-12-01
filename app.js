var express = require('express');
var axios = require('axios');
var path = require('path');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var bodyParser = require('body-parser');
var csurf = require('csurf');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var secret = require('./config/secret');
var ejs = require('ejs');
var engine = require('ejs-mate');
var flash = require('express-flash');
var waterfall = require('async-waterfall');

var app = express();

app.use(session({
	secret: 'guessTheSecret',
	resave: false,
	saveUninitialiazed: false,
	cookie: { maxAge: 180 * 60 * 1000} //in milliseconds
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(__dirname + '/public'));
app.engine('ejs', engine);
app.set('view engine', 'ejs');

var userloginServer = "http://192.168.99.100:5000/"
var productCatalogueServer = "http://192.168.99.100:5001/"
var cartServer = "http://192.168.99.100:5002/"
var orderServer = "http://192.168.99.100:5003/"
var paymentServer = ""

var userID = null;
var isLoggedIn = false;
var cartQuantity = 0;
var cart = null;
var cartID = null;

//cart.items = [];
//cart.Total = 0;

app.get('/signin', function(request, response) {
	response.render('user/login',  {login: isLoggedIn, cartQuantity: cartQuantity});
});

app.get('/signup', function(request, response) {
  response.render('user/signup', {login: isLoggedIn, cartQuantity: cartQuantity});
});

app.post('/signin', function(request, response) {
	var emailID = request.body.email;
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.open("GET", userloginServer+ "users/" +emailID);
	xmlhttp.setRequestHeader("Content-Type", "application/json");
	xmlhttp.send();

	xmlhttp.onreadystatechange = function()
	{
		if (this.readyState === 4 && this.status === 200) {
			var responseText = JSON.parse(this.responseText);

			if(responseText.Email == emailID) {
				isLoggedIn = true;
				cartID = responseText.CartID;
				userID = responseText.UserID;

				response.redirect("/products");
			}
			else {
				response.redirect("/signin");
			}
		}
	}
});

app.post('/signup', function(request, response) {

signUpCallback(request, (newCartId)=>{
	if(newCartId){
		console.log(newCartId);
		console.log("Type is:");
		console.log(typeof newCartId);

		 var xmlhttp = new XMLHttpRequest();
			xmlhttp.open("POST", userloginServer + "users");
			xmlhttp.setRequestHeader("Content-Type", "application/json");
			var jsonToSend = {
				"Name": request.body.name,
				"Email":  request.body.email,
				"Address": request.body.address,
				"Password": request.body.password,
				"CartID": ""+newCartId
			};

			xmlhttp.send(JSON.stringify(jsonToSend));
			xmlhttp.onreadystatechange = function()
			{
				if (this.readyState === 4 && this.status === 200) {
					response.redirect("/signin")
				}
				else if (this.readyState === 4 && this.status !== 200) {
					response.redirect("/signup");
				}
			}

		}
	});
});

function signUpCallback(req,callback){
	var xmlhttp1 = new XMLHttpRequest();
	xmlhttp1.open("POST", cartServer + "carts");
	xmlhttp1.setRequestHeader("Content-Type", "application/json");
	var jsonToSend1 = {

	};

	xmlhttp1.send(JSON.stringify(jsonToSend1));

	xmlhttp1.onreadystatechange = function() {
		if (this.readyState === 4 && this.status === 200) {
			var newCart = JSON.parse(this.responseText);
			newCartId = newCart.CartID;
			callback(newCartId);
		}
	}
}

function createNewCart() {
	var xmlhttp1 = new XMLHttpRequest();
	xmlhttp1.open("POST", cartServer + "carts");
	xmlhttp1.setRequestHeader("Content-Type", "application/json");
	var jsonToSend1 = {

	};

	xmlhttp1.send(JSON.stringify(jsonToSend1));

	xmlhttp1.onreadystatechange = function() {
		if (this.readyState === 4 && this.status === 200) {
			var newCart = JSON.parse(this.responseText);
			newCartId = newCart.CartID;
			return newCartId;
		}
	}

	return null;
}

app.get('/products', function(request, response) {

	productCatalogCallBack(request, ()=>{

		var xmlhttp1 = new XMLHttpRequest();
		xmlhttp1.open("GET", productCatalogueServer+ "products");
		xmlhttp1.setRequestHeader("Content-Type", "application/json");
		xmlhttp1.send();

		xmlhttp1.onreadystatechange = function()
		{
				if (this.readyState === 4 && this.status === 200) {
					var products_array = JSON.parse(this.responseText);
					response.render('./main/catalog', {products: products_array, login: isLoggedIn, cartQuantity: cartQuantity});
				}
		}
	});
});

function productCatalogCallBack(req, callback) {

	if(isLoggedIn) {
		var xmlhttp1 = new XMLHttpRequest();
		xmlhttp1.open("GET", cartServer+ "carts/"+cartID);
		xmlhttp1.setRequestHeader("Content-Type", "application/json");
		xmlhttp1.send();

		xmlhttp1.onreadystatechange = function()
		{
				if (this.readyState === 4 && this.status === 200) {
					cart = JSON.parse(this.responseText);
					cartQuantity = cart.Products.length;
					//response.render('./main/catalog', {products: products_array, login: isLoggedIn, cartQuantity: 0});
				}
		}
	}

	callback();
}

app.get('/', function(request, response){
	if (isLoggedIn) {
		response.redirect('/products');
	}
	else {
		isLoggedIn = false;
	}

	var xmlhttp = new XMLHttpRequest();
	xmlhttp.open("GET", productCatalogueServer+ "products");
	xmlhttp.setRequestHeader("Content-Type", "application/json");
	xmlhttp.send();
	xmlhttp.onreadystatechange = function() {
		if (this.readyState === 4 && this.status === 200) {
			var products_array = JSON.parse(this.responseText);
			response.render('./main/catalog', {products: products_array, login: isLoggedIn, cartQuantity: cartQuantity});
		}
	}
	//response.render('user/login', {login:isLoggedIn, cartQuantity: 0});
});

app.get('/products/:id', function(request, response) {
	var productId = request.params["id"];
	var xmlhttp1 = new XMLHttpRequest();
	xmlhttp1.open("GET", productCatalogueServer+ "products/" + productId);
	xmlhttp1.setRequestHeader("Content-Type", "application/json");
	xmlhttp1.send();

	xmlhttp1.onreadystatechange = function()
	{
		if (this.readyState === 4 && this.status === 200) {
			var product = JSON.parse(this.responseText);
			response.render('./main/product', {product: product, login: isLoggedIn, cartQuantity: cartQuantity});
		}
	}
});

app.post('/products/:id', function(request, response) {

	addToCartCallBack(request, ()=>{
		var productId = request.params["id"];
		var xmlhttp1 = new XMLHttpRequest();
		xmlhttp1.open("GET", productCatalogueServer+ "products/" + productId);
		xmlhttp1.setRequestHeader("Content-Type", "application/json");
		xmlhttp1.send();

		xmlhttp1.onreadystatechange = function()
		{
			if (this.readyState === 4 && this.status === 200) {
				var product = JSON.parse(this.responseText);
				response.render('./main/product', {product: product, login: isLoggedIn, cartQuantity: cart.Products.length});
			}
		}
	});
});

function addToCartCallBack(request, callback) {

	var quantityOfProduct = request.body.quantity;
	var price = request.body.priceHidden;
	var productName = request.body.item;

	var isAlreadyPresent = false;

	for (var i=0;i<cart.Products.length;i++) {
		var currentProduct = cart.Products[i].ProductName;

		if(productName === currentProduct) {
			var quantityOfCurrentProduct = cart.Products[i].Quantity;
			var temp = parseInt(quantityOfCurrentProduct)+parseInt(quantityOfProduct);
			quantityOfCurrentProduct = temp.toString();
			cart.Products[i].Quantity = quantityOfCurrentProduct;
			isAlreadyPresent = true;
			break;
		}
	}

	if(!isAlreadyPresent) {
		var productDetailsToBeInsertedIntoTheCart = {

				"ProductName": productName,
				"Price": price,
				"Quantity": quantityOfProduct
		};

		cart.Products.push(productDetailsToBeInsertedIntoTheCart);
	}

	var xmlhttp = new XMLHttpRequest();
	xmlhttp.open("PUT", cartServer+ "carts");

	xmlhttp.setRequestHeader("Content-Type", "application/json");
	xmlhttp.send(JSON.stringify(cart));

	xmlhttp.onreadystatechange = function()
	{
			if (this.readyState === 4 && this.status === 200) {
				cart = JSON.parse(this.responseText);
				cartQuantity = cart.Products.length;

				console.log("cartQuantity is: "+cartQuantity);
			}
	}

	callback();
}

app.get('/cart', function(request, response) {

	if(isLoggedIn) {
		caluclateTotal(cart);
		response.render('./main/cart', {foundCart: cart, login: isLoggedIn, cartQuantity: cartQuantity});
	}
	else {
		response.redirect("/signin");
	}
});

app.post('/remove', function(request, response) {
	var productNameToRemove = request.body.item;

	var dummyCart = cart;
	for (var i=0; i<dummyCart.Products.length;i++) {
		var product = dummyCart.Products[i];

		if(product.ProductName === productNameToRemove) {
			delete dummyCart.Products[i];
		}
	}

	var procutArray = dummyCart.Products;

	var filtered = procutArray.filter(function (element) {
  	return element != null;
	});

	cart = dummyCart;
	cart.Products = filtered;
	cartQuantity = cart.Products.length;
	updateTheCart(cart, ()=> {

	});
	response.redirect('/cart');
});

function caluclateTotal(cart) {

	var totalAmount = 0;

	for (var i=0; i<cart.Products.length; i++) {
		var productPrice = parseInt(cart.Products[i].Price);
		var productQuantity = parseInt(cart.Products[i].Quantity);

		totalAmount+=productPrice*productQuantity;
	}

	cart.Total = totalAmount.toString();
}

function updateTheCart(cart, callback) {
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.open("PUT", cartServer+ "carts");
	xmlhttp.setRequestHeader("Content-Type", "application/json");
	xmlhttp.send(JSON.stringify(cart));

	xmlhttp.onreadystatechange = function()
	{
			if (this.readyState === 4 && this.status === 200) {
				cart = JSON.parse(this.responseText);
				cartQuantity = cart.Products.length;
				callback();
			}
	}
}

app.get('/logout', function(request, response) {
	updateTheCart(cart, ()=>{
		isLoggedIn = false;
		cart = null;
		cartQuantity = 0;
		userID = null;
		response.redirect('/products');
	});
});

app.post('/order', function(request, response) {

	if (!isLoggedIn) {
		response.redirect('/signIn');
	}

	createOrderCallback(request, (order)=> {
		console.log("Inside ------------------------------------------");
		console.log(order);
		cartQuantity = 0;
		cart.Products = [];
		updateTheCart(cart, () => {
			response.render('./main/orderdetail', {order: order, login: isLoggedIn, cartQuantity: cartQuantity});
		});
	});
});

function createOrderCallback (request, callback) {

	var xmlhttp = new XMLHttpRequest();
	xmlhttp.open("POST", orderServer+ "orders");
	xmlhttp.setRequestHeader("Content-Type", "application/json");

	var jsonToSend = {
		"UserID": userID,
		"Total":  cart.Total,
		"Products": cart.Products
	};

	xmlhttp.send(JSON.stringify(jsonToSend));

	var order = null;

	xmlhttp.onreadystatechange = function()
	{
			if (this.readyState === 4 && this.status === 200) {
				order = JSON.parse(this.responseText);
				callback(order);
			}
	}
}

app.get('/orders', function(request, response) {

	if (!isLoggedIn) {
		response.redirect('/');
	}
	getAllorders(request, (orders)=>{
		if(orders==null)	orders = [];
		response.render('./main/orders', {orders: orders, login:isLoggedIn, cartQuantity:cartQuantity});
	});
});

function getAllorders(request, callback) {
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.open("GET", orderServer+ "orderofusers/" + userID);
	xmlhttp.setRequestHeader("Content-Type", "application/json");

	xmlhttp.send();

	var orders = null;
	xmlhttp.onreadystatechange = function()
	{
		if (this.readyState === 4 && this.status === 200) {
			orders = JSON.parse(this.responseText);
			callback(orders);
		}
	}
}

function getOrder(request, callback) {
	var orderid = request.params["orderid"];
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.open("GET", orderServer + "orders/" + orderid);
	xmlhttp.setRequestHeader("Content-Type", "application/json");

	xmlhttp.send();

	var currentOrder = null;
	xmlhttp.onreadystatechange = function()
	{
		if (this.readyState === 4 && this.status === 200) {
			currentOrder = JSON.parse(this.responseText);
			callback(currentOrder);
		}
	}
}

app.get('/vieworder/:orderid', function(request, response) {
	getOrder(request, (currentOrder)=>{
		console.log(currentOrder);
		response.render('./main/viewOrderDetails', {order:currentOrder, login:isLoggedIn, cartQuantity:cartQuantity});
	});
});

app.listen(secret.port, function (err) {
    if (err) throw err;
    console.log('Server is listening on port ' + secret.port + '!');
});
