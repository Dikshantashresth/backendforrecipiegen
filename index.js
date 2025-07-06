const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('./models/user'); 
const recipiemodel = require('./models/recipie');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const key = process.env.SECRET_KEY;
const uri = process.env.MONGO_URI;

app.use(cors(
    {
        origin: 'https://recipiegen.vercel.app',
        credentials: true
    }
));
app.use(express.json());
app.use(cookieParser());
mongoose.connect(uri)
.then(()=>{
    console.log('connect');
})    

app.post('/login', async(req,res)=>{
    const {email,password} = req.body;
    const user = await userModel.findOne({email});
    if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

    if(user){
        bcrypt.compare(password,user.password,(err,isvalid)=>{
            if(!isvalid){
                return res.status(401).json({ message: 'Invalid credentials' });
            }
            if(isvalid){
                jwt.sign({userid: user._id,username: user.username, email: user.email},process.env.SECRET_KEY,{},(err,token)=>{
                    if(err) throw err;
                    res.cookie('token',token).json({
                        id:user._id,
                        username: user.username,
                        email:user.email,
                    })
                })
            }
        })
    }
})
app.get('/profile', (req, res) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  jwt.verify(token, key, {}, (err, userData) => {
    if (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    
    res.json({
      id: userData.userid,
      username: userData.username,
      email: userData.email,
    });
  });
});
app.get('/logout', (req, res) => {
  res.cookie('token',' ', {
    httpOnly: true,
    sameSite: 'none', // 'none' if using HTTPS + secure
    secure: true,   // true if deployed on HTTPS
  });
  res.status(200).json({ message: 'Logged out successfully' });
});

  app.get('/search',async (req,res)=>{
    const {title} = req.query;
    const recipies = await recipiemodel.find({recipiename: new RegExp(title, 'i')});
    if(recipies.length > 0){
        res.status(200).json(recipies);
    }
  })
app.post('/addrecipie',async (req,res)=>{
    const {Title,Description,Ingredients,Procedure} = req.body;
    const recipie = await recipiemodel.create({
        user: req.cookies.token ? jwt.verify(req.cookies.token, key).userid : null,
        recipiename: Title,
        desc: Description,
        ingredients: Ingredients,
        process: Procedure 
    });
    res.status(201).json({ message: 'Recipe added', recipie: recipie});
    
})
app.get('/myrecipies',async(req,res)=>{
    const token = req.cookies?.token;

    const userid = jwt.verify(token, key).userid;
    if(userid){
        const recipies = await recipiemodel.find({id: userid.id});
        res.status(200).json(recipies);
    }
    
})

app.get('/recipies',async(req,res)=>{
    const recipies = await recipiemodel.find();
    res.status(200).json(recipies);

})
app.get('/recipie/:id',async (req,res)=>{
    const {id} = req.params;
    const recipie = await recipiemodel.findById(id);
    if(recipie){
        res.status(200).json(recipie)
    }
});
app.post('/register',async (req,res)=>{
    const {username,email,password} = req.body;
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password,salt);
    const user = await userModel.create({
        username,
        email,
        password: hash
    });
    jwt.sign({userid: user._id, username: user.username},key,{},(err,token)=>{
        if(err) throw err;
        res.cookie('token',token,{httpOnly:true,
            sameSite: 'none',
            secure: false, 
        }).json({
            id: user._id,
            username:user.username,
            email:user.email,
        });
    });
   


});
app.listen(process.env.PORT);