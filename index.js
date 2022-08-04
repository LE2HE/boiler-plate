const express = require('express')
const app = express()
const port = 5000
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const config = require('./config/key');

const { auth } = require('./middleware/auth');
const { User } = require("./models/User");

// application/x-www-format-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));
// application/json
app.use(bodyParser.json());
//cookie
app.use(cookieParser());

const mongoose = require('mongoose')
mongoose.connect(config.mongoURI, {
  useNewUrlParser: true, useUnifiedTopology: true
}).then(() => console.log('MongoDB Connected...'))
.catch(err => console.log(err))

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.post('/api/users/register', (req, res) => {

  const user = new User(req.body)

  user.save((err, userInfo) => {
    if (err) return res.send({ success: false, err })
    return res.status(200).send({
      success: true
    })
  })
})


app.post('/api/users/login', (req, res) => {

  // DB에서 이메일 확인
  User.findOne({ email: req.body.email }, (err, user) => {
    if (!user) {
      return res.json({
        loginSuccess: false,
        message: "제공된 이메일에 해당하는 유저가 없습니다."
      })
    }
    // 이메일 맞으면 비밀번호 확인
    user.comparePassword(req.body.password, (err, isMatch) => {
      if (!isMatch)
        return res.json({ loginSuccess: false, message: "비밀번호가 틀렸습니다." })
    
      // 비밀번호 맞으면 토큰 생성
      user.generateToken((err, user) => {
        if(err) return res.status(400).send(err);
        
        // 토큰 저장 -> 쿠키/로컬스토리지 등 -> 쿠기에 저장
        res.cookie("x_auth", user.token)
           .status(200)
           .json({ loginSuccess: true, userId: user._id })

      })
    })
  })
})

app.get('/api/users/auth', auth, (req, res) => {
  // Auth = true
  res.status(200).json({
    _id: req.user._id,
    isAdmin: req.user.role === 0 ? false : true, // 0은 일반유저, 0이 아니면 관리자
    isAuth: true,
    email : req.user.email,
    name: req.user.name,
    lastname: req.user.lastname,
    role: req.user.role,
    image: req.user.image
  })
})

app.get('/api/users/logout', auth, (req, res) => {
  User.findOneAndUpdate({ _id: req.user._id },
    { token : "" }
    , (err, user) => {
      if (err) return res.json({ success: false, err });
      return res.status(200).send({
        success: true
      })
  })
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
