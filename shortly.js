var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');
var User = require('./app/models/user');
var Users = require('./app/collections/users');
var session = require('express-session');

var app = express();
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

app.use(session({
  resave: false, // don't save session if unmodified
  saveUninitialized: false, // don't create session until something stored
  secret: 'shhhh, very secret'
}));

/** AUTH Implementation **/

function restrict(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
}

function authenticate(username, password, fn) {
  new User({username: username}).fetch().then(function(found) {
    if (found) {
      console.log("Terrific that user exists with this info:", found.attributes);
        if (password === found.attributes.password){
          fn(found);
        }else{
          res.send(200, "Sorry the passwords don't match");
        }
    } else {
      res.send(200,"Sorry, that is not a valid username");
    }
  });
}

app.get('/', restrict,
function(req, res) {
  res.render('index');
});



app.get('/login', 
function(req, res) {
  res.render('login');
});

app.get('/signup', 
function(req, res) {
  res.render('signup');
});

app.get('/create', restrict,  
function(req, res) {
  res.render('index');
});

app.get('/logout', function(req, res){
  // destroy the user's session to log them out
  // will be re-created next request
  req.session.destroy(function(){
    res.redirect('/');
  });
});

app.get('/links', 
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.get('/restricted', restrict, function(req, res){
  res.send('Wahoo! restricted area, click to <a href="/logout">logout</a>');
});


/**TODO: Remove this catastrophically insecure helper**/
app.get('/users', restrict,
function(req, res) {
  Users.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.post('/login',
  function(req,res){
    //Todo: Hash password check
authenticate(req.body.username, req.body.password, function(user){
    if (user) {
      // Regenerate session when signing in
      // to prevent fixation
      req.session.regenerate(function(){
        // Store the user's primary key
        // in the session store to be retrieved,
        // or in this case the entire user object
        req.session.user = user;
        req.session.success = 'Authenticated as ' + user.name
          + ' click to <a href="/logout">logout</a>. '
          + ' You may now access <a href="/restricted">/restricted</a>.';
        res.redirect('/');
      });
    } else {
      req.session.error = 'Authentication failed, please check your '
        + ' username and password.'
        + ' (use "tj" and "foobar")';
      res.redirect('/login');
    }
  });

});

app.post('/signup',
  function(req,res){
    console.log("THEIR SIGNUP INFO", req.body);

    var username = req.body.username;
    var password = req.body.password;

  new User({username: username}).fetch().then(function(found) {

    if (found) {
      console.log("THIS USER ALREADY EXISTS!!", found.attributes);
      res.send(200, "Sorry, that username is already taken. Please try a different one.");
    } else {
     Users.create({
        username: username,
        password: password,
      })
      .then(function(newUser) {
        //console.log("\n\n\n**NEW USER CREATED***", newUser);
        //Maybe redirect them? Login them into a session? A bunch of other authentication stuff?
        res.redirect('/');

        //Figure out: Login. After creation, log them in.
        //res.send(200, newUser);
      });
    }
  });

});


app.post('/links', 
function(req, res) {
  var uri = req.body.url;
  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      console.log("THIS THING ALREADY EXISTS!!", found.attributes);
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        Links.create({
          url: uri,
          title: title,
          base_url: req.headers.origin
        })
        .then(function(newLink) {
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/



/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  console.log("wildcard handler params", req.params[0]);
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits')+1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
