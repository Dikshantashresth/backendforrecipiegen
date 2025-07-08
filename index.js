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
const allowedOrigins = [
  'http://localhost:5173',
  'https://recipiegen.vercel.app',
  'https://recipiegen-qtq3r9evo-dikshantashresths-projects.vercel.app',
  'https://recipiegen-git-main-dikshantashresths-projects.vercel.app'
];
app.use(cors(
  {
    origin: allowedOrigins,
    credentials: true
  }
));
app.use(express.json());
app.use(cookieParser());
mongoose.connect(uri)
  .then(() => {
    console.log('connect');
  })

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await userModel.findOne({ email });
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  if (user) {
    bcrypt.compare(password, user.password, (err, isvalid) => {
      if (!isvalid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      if (isvalid) {
        jwt.sign({ userid: user._id, username: user.username, email: user.email }, key, {}, (err, token) => {
          if (err) throw err;


          res.cookie('token', token, {
            httpOnly: true,
            sameSite: 'none', 
            secure: true,                     
          }).json({
            id: user._id,
            username: user.username,
            email: user.email,
          })
        })
      }
    })
  }
})
app.delete('/delete/:id',async(req,res)=>{
  const {id} = req.body.params;
  const deleted = await recipiemodel.deleteOne({user: id});
  if(deleted){
    console.log('deleted');
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
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'none', // 'none' if using HTTPS + secure
    secure: true,   // true if deployed on HTTPS
  });
  res.status(200).json({ message: 'Logged out successfully' });
});

app.get('/search', async (req, res) => {
  const { title } = req.query;
  const recipies = await recipiemodel.find({ recipiename: new RegExp(title, 'i') });
  if (recipies.length > 0) {
    res.status(200).json(recipies);
  } else {
    res.status(200).json('no such food');
  }
})
app.post('/addrecipie', async (req, res) => {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    let userData;
    try {
      userData = jwt.verify(token, key);
    } catch (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }

    const { Title, Description, Ingredients, Procedure } = req.body;

    if (!Title || !Description || !Ingredients || !Procedure) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    const recipie = await recipiemodel.create({
      user: userData.userid,
      recipiename: Title,
      desc: Description,
      ingredients: Ingredients,
      process: Procedure,
    });

    res.status(201).json({ message: 'Recipe added', recipie });
  } catch (err) {
    console.error('❌ Error in /addrecipie:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});
app.get('/myrecipies', async (req, res) => {
  try {
    const token = req.cookies?.token;
    console.log('Token:', token);

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: No token' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, key);
      console.log('Decoded token:', decoded);
    } catch (err) {
      console.error('JWT verification error:', err.message);
      return res.status(401).json({ message: 'Invalid token' });
    }

    const userid = decoded.userid;
    if (!userid) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    const recipies = await recipiemodel.find({ user: userid });
    return res.status(200).json(recipies);

  } catch (error) {
    console.error("Error in /myrecipies:", error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});



app.get('/recipies', async (req, res) => {
  const recipies = await recipiemodel.find();
  res.status(200).json(recipies);

})
app.get('/recipie/:id', async (req, res) => {
  const { id } = req.params;
  const recipie = await recipiemodel.findById(id);
  if (recipie) {
    res.status(200).json(recipie)
  }
});
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  const user = await userModel.create({
    username,
    email,
    password: hash
  });
  jwt.sign({ userid: user._id, username: user.username }, key, {}, (err, token) => {
    if (err) throw err;
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
    }).json({
      id: user._id,
      username: user.username,
      email: user.email,
    });
  });



});
app.listen(process.env.PORT);