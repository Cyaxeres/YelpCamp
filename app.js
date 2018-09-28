const express = require('express')
const app = express()
const path = require('path')
const flash = require('connect-flash')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const methodOverride = require('method-override')
const User = require('./models/user')

// var seedDB = require('./seeds')

// Routes
const commentRoutes = require('./routes/comments')
const campgroundRoutes = require('./routes/campgrounds')
const authRoutes = require('./routes/index')

// ! Can export mongoURI to separate file
mongoose.connect(process.env.DATABASEURL)
// mongoose.connect('mongodb://cyax:cyax23@ds145072.mlab.com:45072/yelp_camp')
app.use(bodyParser.urlencoded({
  extended: true
}))
app.use(bodyParser.json())
app.set('view engine', 'ejs')
app.use(express.static(path.join(__dirname, '/public')))
app.use(methodOverride('_method'))
// seedDB()
app.locals.moment = require('moment')

app.use(require('express-session')({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}))
app.use(flash())
app.use(passport.initialize())
app.use(passport.session())
passport.use(new LocalStrategy(User.authenticate()))
passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())

app.use(function (req, res, next) {
  res.locals.currentUser = req.user
  res.locals.error = req.flash('error')
  res.locals.success = req.flash('success')
  next()
})

// Routing Middleware
app.use('/', authRoutes)
app.use('/campgrounds', campgroundRoutes)
app.use('/campgrounds/:id/comments', commentRoutes)

const port = process.env.PORT || 8080

app.listen(port, function () {
  console.log('Server running on port ' + port)
})
