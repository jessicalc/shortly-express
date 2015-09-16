var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');
var passport = require('passport');
var GitHubStrategy = require('passport-github2').Strategy;


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

/* Set up stragetgy */
passport.use(new GitHubStrategy({
    clientID: 'd30ca69ba586ca3eaf73',
    clientSecret: 'a67961550c89fdde9622bf40eeb73a9f614c121d',
    callbackURL: "http://127.0.0.1:4568"
  },
  function(accessToken, refreshToken, profile, done) {
    process.nextTick(function () {
      console.log(profile);
      return done(null, profile);
    });
  })
);

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// app.use(express.cookieParser());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

app.use(session({
  secret: 'keyboard cat',
  cookie: {}
}));

app.get('/', 
function(req, res) {
  if (!req.session.user) {
    res.redirect('login');
  } else {
    console.log(req.session.user);
    res.render('index', {username: req.session.user});
  }
});

app.get('/create', 
function(req, res) {
  if (!req.session.user) {
    res.redirect('/login');
  } else {
    res.render('index');
  }
});

app.get('/links', 
function(req, res) {
  if (!req.session.user) {
    console.log("not signed in");
    res.redirect('/login');
  } else {
    console.log(req.session.user_id);
    Links.query(function(query) {
      query.where('user_id', '=', req.session.user_id);
    }).fetch().then(function(links) {
      res.send(200, links.models);
    });
  }
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
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }
        /* Get id associated with session */


        Links.create({
          url: uri,
          title: title,
          user_id: req.session.user_id,
          //  set the user_id to the req.session.id
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

app.get('/login', 
function(req, res) {
  if (!req.session.user) {
    res.render('login');
  } else {
    res.redirect('/');
  }
});

app.post('/login', 
function(req, res) {
  new User({'username': req.body.username})
    .fetch()
    .then(function(model){
      if (model) {
        req.session.user = req.body.username;
        req.session.user_id = model.get('id');
        console.log('req.session.user_id is', model.get('id'));
        res.redirect('/');
      } else {
        // res.writeHead()
        res.redirect('/login');
      }
    });
  
});

app.get('/signup',
function(req, res) {
  res.render('signup');
});

app.post('/signup',
function(req, res) {
  new User({username: req.body.username, password: req.body.password}).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      console.log("Are you creating a new user?");
      Users.create({
        username: req.body.username,
        password: req.body.password,
      })
      .then(function(newUser) {
        req.session.user = req.body.username;
        req.session.user_id = newUser.get('id');
        console.log('session ID on signup is', req.session.user_id);
        res.redirect('/');
      });
    }
  });
});

/* Logout functionality */
app.get('/logout', function(req, res){
  console.log("Logging out in shortly.js in server");
  req.session.destroy(function(err) {
    if (err) console.log("Crap! Something wrong")
  });
  res.clearCookie('user');
  res.redirect('/');
});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
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
