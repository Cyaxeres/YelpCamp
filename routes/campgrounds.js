const express = require('express')
const router = express.Router()
const Campground = require('../models/campground')
const middleware = require('../middleware')

router.get('/', function (req, res) {
  Campground.find({}, function (err, allCampgrounds) {
    if (err) {
      console.log(err)
    } else {
      res.render('campgrounds/index', {
        campgrounds: allCampgrounds
      })
    }
  })
})

router.post('/', middleware.isLoggedIn, function (req, res) {
  const name = req.body.name
  const price = req.body.price
  const image = req.body.image
  const desc = req.body.description
  const author = {
    id: req.user._id,
    username: req.user.username
  }
  const newCampground = {
    name: name,
    price: price,
    image: image,
    description: desc,
    author: author
  }
  Campground.create(newCampground, function (err, newlyCreated) {
    if (err) {
      req.flash('error', err)
    } else {
      req.flash('success', 'Successfully added campground!')
      res.redirect('/campgrounds')
    }
  })
})

router.get('/new', middleware.isLoggedIn, function (req, res) {
  res.render('campgrounds/new')
})

router.get('/:id', function (req, res) {
  Campground.findById(req.params.id).populate('comments').exec(function (err, foundCampground) {
    if (err || !foundCampground) {
      console.log(err)
      req.flash('error', 'Sorry, that campground doesn\'t exist')
      return res.redirect('/campgrounds')
    } else {
      res.render('campgrounds/show', {
        campground: foundCampground
      })
    }
  })
})

router.get('/:id/edit', middleware.checkCampgroundOwner, function (req, res) {
  Campground.findById(req.params.id, function (err, foundCampground) {
    if (err) {
      res.redirect('/:id')
    } else {
      res.render('campgrounds/edit', {
        campground: foundCampground
      })
    }
  })
})

router.put('/:id', middleware.checkCampgroundOwner, function (req, res) {
  Campground.findByIdAndUpdate(req.params.id, req.body.campground, function (err, updatedCampground) {
    if (err) {
      res.redirect('/:id')
    } else {
      req.flash('success', 'Successfully edited campground!')
      res.redirect('/campgrounds/' + req.params.id)
    }
  })
})

router.delete('/:id', middleware.checkCampgroundOwner, function (req, res) {
  Campground.findByIdAndRemove(req.params.id, function (err) {
    if (err) {
      res.redirect('/campgrounds')
    } else {
      req.flash('success', 'Successfully removed campground!')
      res.redirect('/campgrounds')
    }
  })
})

module.exports = router
