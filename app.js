
/**
 * Module dependencies.
 */

var express = require('express')
  , app = express()
  , http = require('http')
  , fs = require('fs')
  , path = require('path')
  , mongoose = require('mongoose')
  , server = require('http').createServer(app)
  , passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , MongoStore = require('connect-mongo')(express)
  //, ldapauth = require('./node-ldapauth/ldapauth')
  , jade_browser = require('jade-browser')
  , moment = require('moment')
  , nodemailer = require("nodemailer")

nodemailer.SMTP = {
	host: 'mail.alliedmaldives.net'
} 

var sessionStore = new MongoStore({db:'polls_common'});

passport.use(new LocalStrategy({
		usernameField: 'username',
		passwordField: 'pass',
		passReqToCallback: true
	},
	function(req, username, password, done) {
		Admin.findOne({name:username}, function(err, user){
			if(err) throw err;
			if(user){
				req.session.admin = true;
				return done(null, username);
			}else{
				return done(null, false, {message: "Incorrect login details"});
			}

		}); 
		return;			
		ldapauth.authenticate(
			'ldap', 
			'alliedinsure.com.mv', 
			389 /*port*/, username + '@alliedinsure.com.mv', 
			password, 
			function(err, authentic) {
				if(err) return done(err);
				if(authentic){
					Admin.findOne({name:username}, function(err, user){
						if(err) throw err;
						//render if not admin
						if(!user){
							req.session.admin = false;
						}else{
							req.session.admin = true;
						}
						return done(null, username);
					});
				}else{
					return done(null, false, {message: "Incorrect login details"});
				}
			}
		);

	}
));

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(id, done) {
  done(null, id);
});


var db = mongoose.createConnection('localhost', 'polls_common');
var schema = mongoose.Schema({
	title:'string',
	date:'date',
	expire:'date',
	type:'string',
	questions:[{
		required:'boolean',
		title:'string',
		choice:'array',
		multiple_choice:'array',
		text:'number'
		
	}]
},{strict:false});

var Poll = db.model('polls', schema);
var Submitted = db.model("submitted", mongoose.Schema({
	poll_id:'string',
	answers:'array',
	user:'string',
	date:'date',
	cname:'string',
	cemail:'string',
	cvilla:'string',
	cnationality:'string',
	cfrom:'string',
	cto:'string'
},{strict:false}));

var Admin = db.model("admins", mongoose.Schema({
	name:'string'
},{strict:false}));

app.configure(function(){
  //app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.cookieParser("aa"));
  app.use(express.bodyParser({ uploadDir: __dirname + '/public/files' }));
  app.use(express.methodOverride());
  app.use(jade_browser('/templates.js', '**', {root: __dirname + '/views/components', cache:false}));  
  app.use(express.session({ secret: "aa", store: sessionStore, cookie: { maxAge: 1000 * 60 * 60 * 7 * 1000 ,httpOnly: false, secure: false}}));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(function(req,res,next){
  	res.locals.admin = req.session.admin;
  	next();
  });
  app.use(function noCachePlease(req, res, next) {
	res.header("Cache-Control", "no-cache, no-store, must-revalidate");
	res.header("Pragma", "no-cache");
	res.header("Expires", 0);
	next();
  });
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});


app.get('/', function(req,res){
	if (req.isAuthenticated()) {
		if(req.session.redirect){
			console.log(req.session.redirect);
			res.redirect(req.session.redirect);
			req.session.redirect = null;
			return;
		}
		Poll.find({},{title:1}, function(err, docs){
			if(req.session.admin){
				return res.redirect('/admin');
			}
			res.render('index',{heading:'No Polls.', message:' You will be notified if there is any poll.'});
		})
		
	}else{
		res.render('login');
	}
});
app.get('/admin', authenticate, function(req, res){
	Poll.find({},{title:1}, function(err, docs){
		res.render('admin',{polls:docs});
	})
});
app.get('/logout', function(req, res){
	req.logout();
	req.session.destroy();
	res.redirect('/');
});
app.post(
	'/',
	passport.authenticate('local', {
		successRedirect:'/',
		failureRedirect:'/'
	})
);

app.post('/new-survey', authenticate, function(req,res){
	var answers = JSON.parse(req.body.answers);
	var survey = new Survey({answers:answers, ip:req.ip, date:new Date()});
	survey.save(function(){
		Survey.count({}, function(err, count){
		});
		res.end();
	});
});
app.post('/create-poll', authenticate, function(req,res){
	var data = JSON.parse(req.body.data);
	data.expire = new Date(data.expire);
	data.date = new Date();
	new Poll(data).save(function(err,poll){
		res.json(poll);
	});
});
app.get('/new-poll',  function(req,res){
	res.render('new-poll');
});
app.get('/all-polls', function(req,res){
	Poll.find({}, {title:1}, function(err, docs){
		if(err) throw err;
		res.json(docs);
	})
});
app.get('/get-poll/:id', function(req, res){
	var id = req.params.id;
	Poll.findOne({_id:id}, function(err, poll){
		if(err) throw err;
		//total polls
		Submitted.count({poll_id:id}, function(err, count){
			if(err) throw err;
			res.json({poll:poll, total:count});
		});
	});
});

app.post('/submit-poll', function(req, res){
	var answers = JSON.parse(req.body.data);
	var id = req.body.poll;
	var data = {
		poll_id:id,
		answers:answers,
		//user:req.session.passport.user,
		date:new Date(),
		cname:req.body.cname,
		cemail:req.body.cemail,
		cvilla:req.body.cvilla,
		cnationality:req.body.cnationality,
		cfrom:new Date(req.body.cfrom),
		cto:new Date(req.body.cto)
	}

	var poll = new Submitted(data);
	poll.save(function(err, doc){
		if(err) throw err;
		res.json(doc);
	});	
});

app.get('/poll/:id', function(req, res){
	var id = req.params.id;
	
	var data = {};
	
	Poll.findOne({_id:id}, function(err, poll){
		if(err) throw err;
		poll.created = moment(poll.date).format("MMM Do");
		poll.expire = moment(poll.expire).format("MMM Do");
		Submitted.find({poll_id:id}, function(err, polls_taken){
			data.poll = poll;
			data.data = polls_taken;
			res.json(data);
		});
	});
});
app.get('/poll/:id/filter', function(req, res){
	var id = req.params.id;
	var from = new Date(req.query.from);
	var to = new Date(req.query.to);
	var data = {};
	
	Poll.findOne({_id:id}, function(err, poll){
		if(err) throw err;
		poll.created = moment(poll.date).format("MMM Do");
		poll.expire = moment(poll.expire).format("MMM Do");
		Submitted.find({poll_id:id, cfrom:{$gte:from}, cto:{$lt:to}}, function(err, polls_taken){
			data.poll = poll;
			data.data = polls_taken;
			res.json(data);
		});
	});
});
app.get('/k', authenticate, function(req,res){
	res.render('index',{heading:"Thank you :)", message:"Your poll has been submitted. "});
});
app.get('/:poll', function(req,res){
	Poll.findOne({_id:req.params.poll}, function(err, poll){
		res.render('poll', {poll:req.params.poll});
	});		
});
app.post("/invite", function(req,res){
	var emails = req.body.emails;
	var poll = req.body.poll;
	
	emails = emails.split(",");
	emails.forEach(function(to){
		var from ="Poll <system@alliedmaldives.net>"
		nodemailer.send_mail({
			sender: from,
			to: to,
			subject:"New poll",
			html: "<h3>You have been invited to take a new poll</h3><a href='http://poll/"+poll+"'>http://poll/"+poll+"</a>",
			body:''			
		}, function(error, success){
			if(error) return res.json({error:'email failed'});
			res.json({sent:1});
		});
	});
	
})
function authenticate(req,res,next){
  if (req.isAuthenticated()) { return next(); }
  if (req.xhr){
 	 return res.json({error:"authentication failed"});
  }else{
  	return res.redirect('/');
  }
}
server.listen(9000);




