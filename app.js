//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const passport=require("passport");
const session=require("express-session");
const passportLocalMongoose=require("passport-local-mongoose");
const mongoose = require('mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
// const encrypt= require("mongoose-encryption");
// const md5=require("md5");
const app = express();
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));
app.use(session({
  secret:"our little secrets",
  resave:false,
  saveUnintialized:false,
}));
app.use(passport.initialize());
app.use(passport.session());
mongoose.connect("mongodb://localhost:27017/usersDB",{useNewUrlParser: true,useUnifiedTopology: true});
app.set('view engine', 'ejs');
//new is used due mongoose encryprion
mongoose.set("useCreateIndex",true);
const userSchema=new mongoose.Schema({
  email:String,
  password:String,
  googleId:String,
  secrets:String
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
console.log(process.env.API_KEY);
// userSchema.plugin(encrypt,{secret:process.env.SECRET,encryptedfields:["password"]});

const User=mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.SECRET_ID,
    clientSecret: process.env.SECRET_CLIENT,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/",function(req,res){
  res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] })
);

app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect to secrets
    res.redirect('/secrets');
  });

app.get("/login",function(req,res){
  res.render("login");
});
app.get("/register",function(req,res){
  res.render("register");
});

app.get("/secrets",function(req,res){
  User.find({"secrets":{$ne:null}},function(err,foundUser){
    if(err){console.log(err);}
    else{
      if(foundUser){
        res.render("secrets",{usersWithSecrets:foundUser});
      }
    }
  });
  // if(req.isAuthenticated()){
  //   res.render("secrets");
  // }else{
  //   res.render("login");
  // }
});

app.get("/submit",function(req,res){
  if(req.isAuthenticated()){
    res.render("submit");
  }else{
    res.render("login");
  }
})
app.post("/submit",function(req,res){
  const submittedSecret=req.body.secret;
  User.findById(req.user.id,function(err,foundUser){
    if(err){console.log(err);}
    else{
      if(foundUser){
        foundUser.secrets=submittedSecret;
        foundUser.save(function(){
          res.redirect("/secrets");
        });
      }
    }
  })
})
app.get("/logout",function(req,res){
  req.logout();
  res.redirect("/");
});

app.post("/register",function(req,res){
   User.register({username:req.body.username},req.body.password,function(err,user){
     if(err){console.log(err);
         res.redirect("/");
     }else{
       passport.authenticate("local")(req,res,function(){
         res.redirect("/secrets");
       });
     }
   })
  // const newUser=new User({
  //   email:req.body.username,
  //   password:md5(req.body.password)
  // });
  // newUser.save(function(err){
  //   if(err){console.log(err);}
  //   else{
  //     res.render("secrets");
  //   }
  // });
});

app.post("/login",function(req,res){

const user=new User({
  username:req.body.username,
  password:req.body.password
});
req.login(user,function(req,res){
  if(err){
    console.log(err);
  }else{
    passport.authenticate("local")(req,res,function(){
      res.redirect("/secrets");
    });
}

});
  // const username=req.body.username;
  // const password=md5(req.body.password);
  // User.findOne({email:username},function(err,foundUser){
  //   if(err){console.log(err);}
  //   else{
  //     if(foundUser){
  //     if(foundUser.password === password){
  //       res.render("secrets");
  //     }
  //   }
  //   }
  // });

});









app.listen(3000, function() {
  console.log("Server started on port 3000");
});
