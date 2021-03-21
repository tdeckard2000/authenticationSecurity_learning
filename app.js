const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;
const findOrCreate = require('mongoose-findorcreate');
require('dotenv').config();

// Module Settings ================================================================================================
const app = express();
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
const store = new MongoDBStore({
    uri: 'mongodb://127.0.0.1/secrets',
    collection: 'mySessions'
});
app.use(session({
    secret:'some secret',
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: new Date(Date.now() + 3600000),
        maxAge: 3600000
    },
    store: store
}));
app.use(passport.initialize());
app.use(passport.session());


mongoose.connect('mongodb://127.0.0.1/secrets', {useNewUrlParser: true, useUnifiedTopology: true}, (err)=>{
    if(err){
        console.warn(error);
    };
});


// Passport Settings ==============================================================================================
passport.use(new LocalStrategy(
    function(username, password, done){
        User.findOne({email: username}, function(err, user){
            if (err) { return done(err); }
            if (!user) { return done(null, false); }
            if (user.password != password) { return done(null, false); }
            return done(null, user);
        });
    }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/callback",
    profileFields: ['emails']
},

    function(accessToken, refreshToken, profile, done) {
        const facebookEmail = profile.emails[0].value;
        User.findOrCreate({email: facebookEmail}, function(err, user) {
        if (err) { return done(err); }
        done(null, user);
        })
    }
));

passport.serializeUser(function(user, done) {
    done(null, user.id);
});
  
passport.deserializeUser(function(id, done) {
    User.findById(id, function (err, user) {
        if (err) { return done(err); }
        done(null, user);
    });
});
  

// Mongoose Schemas ===============================================================================================
const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

const secretSchema = new mongoose.Schema({
    email: String,
    secret: String
});

// Mongoose-Encryption Settings ===================================================================================
const encKey = process.env.BASE64_32;
const sigKey = process.env.BASE64_64;
userSchema.plugin(findOrCreate);
userSchema.plugin(encrypt, {encryptionKey: encKey, signingKey: sigKey, encryptedFields: ['password']});

// Mongoose Models ================================================================================================
const User = mongoose.model('User', userSchema);
const Secret = mongoose.model('Secret', secretSchema);

// Mongoose Functions =============================================================================================
const createNewUser = function(username, password){
    return new Promise((resolve, reject)=>{
        const newUser = new User({
            email: username,
            password: password
        });
        
        newUser.save((err, result)=>{
            if(!err){
                resolve(true);
            }else{
                console.warn(err);
                reject();
            };
        });
    })
};

const addNewSecret = function(email, secret){
    return new Promise((resolve, reject)=>{
        const newSecret = new Secret({
            email: email,
            secret: secret
        });

        newSecret.save((err, result)=>{
            if(!err){
                resolve(true);
            }else{
                console.warn(err);
                reject();
            };
        });
    });
};

const getUserSecrets = function(email){
    return new Promise((resolve, reject)=>{
        Secret.find({email: email}, (err, result)=>{
            if(!err){
                resolve(result);
            }else{
                console.warn(err);
                reject();
            };
        });
    });
};

// Get Routes =====================================================================================================
app.get('/', (req, res)=>{
    res.render('home');
});

app.get('/login', (req, res)=>{
    res.render('login');
});

app.get('/register', (req, res)=>{
    res.render('register');
});

app.get('/logout', (req, res)=>{
    req.logOut();
    res.redirect('/');
});

app.get('/secrets', ensureLoggedIn('/login'), async (req, res)=>{
    const email = req.user.email;
    const secrets = await getUserSecrets(email);

    if(req.user){
        res.render('secrets', {secrets: secrets});
    }else{
        res.redirect('/login');
    }
});

app.get('/submit', ensureLoggedIn('/login'), (req, res)=>{
    res.render('submit')
});

// app.get('/submit', (req, res)=>{
//     res.render('submit');
// });

// Post Routes =====================================================================================================
app.post('/register', async (req, res)=>{
    const username = req.body.username;
    const password = req.body.password;

    try{
        result = await createNewUser(username, password);
        if(result){
            res.render('secrets');
        };
    }catch(err) {
        console.warn(err);
    };
});

app.post('/login', passport.authenticate('local', {failureRedirect: '/login'}), (req, res)=>{
    res.redirect('secrets');
});

app.post('/submit', ensureLoggedIn('/login'), async (req, res)=>{
    const secret = req.body.secret;
    const email = req.user.email;

    try{
        const result = await addNewSecret(email, secret);
        if(result){
            res.redirect('secrets');
        }else{
            res.send('<h4 style="text-align: center;">Error saving secret<h4>')
        };
    }catch(err){
        res.send('<h4 style="text-align: center;">Error saving secret<h4>')
    };
});

// Facebook Routes =================================================================================================
app.get('/auth/facebook', passport.authenticate('facebook', { scope : ['email'] }));

app.get('/auth/facebook/callback', passport.authenticate('facebook', { successRedirect: '/secrets', failureRedirect: '/login' }));

// Server ==========================================================================================================
app.listen(3000, ()=>{
    console.warn("localhost:3000");
});

