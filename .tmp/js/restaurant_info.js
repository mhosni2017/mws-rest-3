"use strict";

var restaurant = void 0;
var map;

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = function () {
  fetchRestaurantFromURL(function (error, restaurant) {
    if (error) {
      // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById("map"), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
      google.maps.event.addDomListener(window, "resize", function () {
        map.setCenter(restaurant.latlng);
      });
    }
  });
};

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = function fetchRestaurantFromURL(callback) {
  if (self.restaurant) {
    // restaurant already fetched!
    callback(null, self.restaurant);
    return;
  }
  var id = getParameterByName("id");
  if (!id) {
    // no id found in URL
    error = "No restaurant id in URL";
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, function (error, restaurant) {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant);
    });
  }
};

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = function fillRestaurantHTML() {
  var restaurant = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : self.restaurant;

  var name = document.getElementById("restaurant-name");
  name.innerHTML = restaurant.name;

  var address = document.getElementById("restaurant-address");
  address.innerHTML = restaurant.address;

  var image = document.getElementById("restaurant-img");
  image.className = "restaurant-img";

  var imgurlbase = DBHelper.imageUrlForRestaurant(restaurant);
  var imgparts = imgurlbase.split(".");
  var imgurl1x = imgparts[0] + "_1x.jpg"; /*+imgparts[1];*/
  var imgurl2x = imgparts[0] + "_2x.jpg"; /*+imgparts[1];*/
  image.src = imgurl1x;
  image.srcset = imgurl1x + " 700w, " + imgurl2x + " 1200w";
  image.alt = restaurant.name + " Image";
  var favButtonContainer = document.getElementById("fav-button-container");
  favButtonContainer.append(DBHelper.favoriteButton(restaurant));
  var cuisine = document.getElementById("restaurant-cuisine");
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  DBHelper.fetchReviewsByRestaurantId(restaurant.id).then(fillReviewsHTML);
};

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = function fillRestaurantHoursHTML() {
  var operatingHours = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : self.restaurant.operating_hours;

  var hours = document.getElementById("restaurant-hours");
  for (var key in operatingHours) {
    var row = document.createElement("tr");

    var day = document.createElement("td");
    day.innerHTML = key;
    row.appendChild(day);

    var time = document.createElement("td");
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
};

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = function fillReviewsHTML() {
  var reviews = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : self.restaurant.reviews;

  var container = document.getElementById("reviews-container");
  var title = document.createElement("h3");
  title.innerHTML = "Reviews";
  container.appendChild(title);

  if (!reviews) {
    var noReviews = document.createElement("p");
    noReviews.innerHTML = "No reviews yet!";
    container.appendChild(noReviews);
  } else {
    var ul = document.getElementById("reviews-list");
    reviews.forEach(function (review) {
      ul.appendChild(DBHelper.createReviewHTML(review));
    });
    container.appendChild(ul);
  }
  var h3 = document.createElement("h3");
  h3.innerHTML = "Leave a Review";
  container.appendChild(h3);
  var id = getParameterByName("id");
  container.appendChild(DBHelper.reviewForm(id));
};

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = function fillBreadcrumb() {
  var restaurant = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : self.restaurant;

  var breadcrumb = document.getElementById("breadcrumb");
  var li = document.createElement("li");
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
};

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = function getParameterByName(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, "\\$&");
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
      results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return "";
  return decodeURIComponent(results[2].replace(/\+/g, " "));
};