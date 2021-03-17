const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');
require('dotenv').config(); 
//bcrypt

const app = express();
console.log(process.env.SESSION_SECRET)
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

// Module Settings =========================================================
mongoose.connect('mongodb://127.0.0.1/secrets', {useNewUrlParser: true, useUnifiedTopology: true}, (err)=>{
    if(err){
        console.log(error);
    };
});

// userSchema.plugin(encrypt, {encryptionKey: encKey, signingKey: sigKey, encryptedFields: ['password']});

// Mongoose Schemas ========================================================
const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

// Mongoose Models =========================================================
const User = mongoose.model('User', userSchema);

// Mongoose Functions ======================================================
const createNewUser = function(username, password){
    return new Promise((resolve, reject)=>{
        console.log("name: " + username)
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

const userLogin = function(username, password){
    return new Promise((resolve, reject)=>{
        User.findOne({email: username, password:password}, (err, results)=>{
            if(!err){
                resolve(results);
            }else{
                console.warn(err);
            };
        });
    });
};

// Get Routes ==============================================================
app.get('/', (req, res)=>{
    res.render('home');
});

app.get('/login', (req, res)=>{
    res.render('login');
});

app.get('/register', (req, res)=>{
    res.render('register');
});

// app.get('/secrets', (req, res)=>{
//     res.render('secrets');
// });

// app.get('/submit', (req, res)=>{
//     res.render('submit');
// });

// Post Routes ==============================================================
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

app.post('/login', async (req, res)=>{
    const username = req.body.username;
    const password = req.body.password;
    
    try{
        const result = await userLogin(username, password);
        if(result){
            res.render('secrets');
        }else{
            console.log('fail');
        };
    }catch(err){
        console.warn(err);
    };

});

// Server ===================================================================
app.listen(3000, ()=>{
    console.log("localhost:3000");
});

