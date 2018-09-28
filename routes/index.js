const express = require('express')
const router = express.Router()
const passport = require('passport')
const User = require('../models/user')
const Campground = require('../models/campground')
const async = require('async')
const nodemailer = require('nodemailer')
const crypto = require('crypto')

router.get('/', function (req, res) {
  res.render('landing')
})

router.get('/register', function (req, res) {
  res.render('register')
})

router.post('/register', function (req, res) {
  const newUser = new User({
    username: req.body.username,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    avatar: req.body.avatar
  })
  if (req.body.adminCode === process.env.ADMIN) {
    newUser.isAdmin = true
  }
  User.register(newUser, req.body.password, function (err, user) {
    if (err) {
      req.flash('error', err.message + '!')
      return res.redirect('/register')
    }
    passport.authenticate('local')(req, res, function () {
      req.flash('success', 'Welcome to GazaCamp ' + user.username + '!')
      res.redirect('/campgrounds')
    })
  })
})

router.get('/login', function (req, res) {
  res.render('login')
})

router.post('/login', passport.authenticate('local', {
  successRedirect: '/campgrounds',
  failureRedirect: '/login'
}), function (req, res) {})

router.get('/logout', function (req, res) {
  req.logout()
  req.flash('success', 'Logged you out!')
  res.redirect('/login')
})

router.get('/forgot', function (req, res) {
  res.render('forgot')
})

router.post('/forgot', function (req, res, next) {
  async.waterfall([
    function (done) {
      crypto.randomBytes(20, function (err, buf) {
        const token = buf.toString('hex')
        done(err, token)
      })
    },
    function (token, done) {
      User.findOne({
        email: req.body.email
      }, function (err, user) {
        if (err || !user) {
          req.flash('error', 'We didn\'t find any account with that email address.')
          return res.redirect('/forgot')
        }
        user.resetPasswordToken = token
        user.resetPasswordExpires = Date.now() + 3600000

        user.save(function (err) {
          done(err, token, user)
        })
      })
    },
    function (token, user, done) {
      const smtpTransport = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
          user: process.env.EMAIL,
          pass: process.env.GMAILPW
        }
      })
      const mailOptions = {
        to: user.email,
        from: process.env.EMAIL,
        subject: 'Node.js Password Reset',
        text: 'You are receiving this because you (or someone else) has requested the reset of the password for this account.\n\n' +
            'Please click the following link, or paste this into your browser to complete the process:\n\n' +
            'http://' + req.headers.host + '/reset/' + token + '\n\n' +
            'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      }
      smtpTransport.sendMail(mailOptions, function (err) {
        req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.')
        done(err, 'done')
      })
    }
  ],
  function (err) {
    if (err) return next(err)
    res.redirect('/forgot')
  })
})

router.get('/reset/:token', function (req, res) {
  User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: {
      $gt: Date.now()
    }
  }, function (err, user) {
    if (err || !user) {
      req.flash('error', 'Password reset token is invalid or has expired.')
      return res.redirect('/forgot')
    }
    res.render('reset', {
      token: req.params.token
    })
  })
})

router.post('/reset/:token', function (req, res) {
  async.waterfall([
    function (done) {
      User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: {
          $gt: Date.now()
        }
      }, function (err, user) {
        if (err || !user) {
          req.flash('error', 'Password reset token is invalid or has expired.')
          return res.redirect('back')
        }
        if (req.body.password === req.body.confirm) {
          user.setPassword(req.body.password, function (err) {
            if (!err) {
              user.resetPasswordToken = undefined
              user.resetPasswordExpires = undefined
              user.save(function (err) {
                if (!err) {
                  req.logIn(user, function (err) {
                    done(err, user)
                  })
                }
              })
            }
          })
        } else {
          req.flash('error', 'Passwords do not match.')
          res.redirect('back')
        }
      })
    },
    function (user, done) {
      const smtpTransport = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
          user: process.env.EMAIL,
          pass: process.env.GMAILPW
        }
      })
      const mailOptions = {
        to: user.email,
        from: process.env.EMAIL,
        subject: 'Your Password has been changed',
        text: 'Hello, \n\n' + 'This is to let you know that the password for your account ' + user.email + ' has just been changed.\n'
      }
      smtpTransport.sendMail(mailOptions, function (err) {
        req.flash('success', 'Success! Your password has been changed.')
        done(err, 'done')
      })
    }
  ],
  function (err) {
    if (!err) {
      return res.redirect('/campgrounds')
    }
  })
})

router.get('/users/:id', function (req, res) {
  User.findById(req.params.id, function (err, foundUser) {
    if (err) {
      req.flash('error', 'Something went wrong.')
      res.redirect('back')
    }
    Campground.find().where('author.id').equals(foundUser._id).exec(function (err, campgrounds) {
      if (err) {
        req.flash('error', 'Something went wrong.')
        res.redirect('/')
      }
      res.render('users/show', {
        user: foundUser,
        campgrounds: campgrounds
      })
    })
  })
})

module.exports = router
