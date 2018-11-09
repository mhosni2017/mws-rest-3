"use strict";

var restaurants = void 0,
    neighborhoods = void 0,
    cuisines = void 0;
var map;
var markers = [];

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener("DOMContentLoaded", function (event) {
  fetchNeighborhoods();
  fetchCuisines();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = function fetchNeighborhoods() {
  DBHelper.fetchNeighborhoods(function (error, neighborhoods) {
    if (error) {
      // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
};

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = function fillNeighborhoodsHTML() {
  var neighborhoods = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : self.neighborhoods;

  var select = document.getElementById("neighborhoods-select");
  neighborhoods.forEach(function (neighborhood) {
    var option = document.createElement("option");
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
};

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = function fetchCuisines() {
  DBHelper.fetchCuisines(function (error, cuisines) {
    if (error) {
      // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
};

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = function fillCuisinesHTML() {
  var cuisines = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : self.cuisines;

  var select = document.getElementById("cuisines-select");

  cuisines.forEach(function (cuisine) {
    var option = document.createElement("option");
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
};

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = function () {
  var loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById("map"), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });

  google.maps.event.addDomListener(window, "resize", function () {
    map.setCenter(loc);
  });

  updateRestaurants();
};

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = function updateRestaurants() {
  var cSelect = document.getElementById("cuisines-select");
  var nSelect = document.getElementById("neighborhoods-select");

  var cIndex = cSelect.selectedIndex;
  var nIndex = nSelect.selectedIndex;

  var cuisine = cSelect[cIndex].value;
  var neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, function (error, restaurants) {
    if (error) {
      // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  });
};

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = function resetRestaurants(restaurants) {
  // Remove all restaurants
  self.restaurants = [];
  var ul = document.getElementById("restaurants-list");
  ul.innerHTML = "";

  // Remove all map markers
  self.markers.forEach(function (m) {
    return m.setMap(null);
  });
  self.markers = [];
  self.restaurants = restaurants;
};

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = function fillRestaurantsHTML() {
  var restaurants = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : self.restaurants;

  var ul = document.getElementById("restaurants-list");
  var tabIndexno = 3;
  restaurants.forEach(function (restaurant) {
    ul.append(createRestaurantHTML(restaurant, tabIndexno));
    tabIndexno++;
  });
  addMarkersToMap();
};

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = function createRestaurantHTML(restaurant, tabIndexno) {
  var li = document.createElement("li");

  var image = document.createElement("img");
  image.className = "restaurant-img";
  var imgurlbase = DBHelper.imageUrlForRestaurant(restaurant);
  var imgparts = imgurlbase.split(".");
  var imgurl1x = imgparts[0] + "_1x.jpg"; /*+imgparts[1];*/
  var imgurl2x = imgparts[0] + "_2x.jpg"; /*+imgparts[1];*/
  image.src = imgurl1x;
  console.log(imgurl1x);
  console.log(imgurl2x);

  image.srcset = "" + imgurl1x; //700w //, ${imgurl2x} 1200w`;
  console.log(image.srcset);

  image.alt = restaurant.name + " Image";
  li.append(image);

  var name = document.createElement("h1");
  name.innerHTML = restaurant.name;
  li.append(name);

  var favButton = DBHelper.favoriteButton(restaurant);
  li.append(favButton);

  var neighborhood = document.createElement("p");
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  var address = document.createElement("p");
  address.innerHTML = restaurant.address;
  li.append(address);

  var more = document.createElement("a");
  more.innerHTML = "View Details";
  //more.setAttribute("tabindex", tabIndexno.toString());
  more.setAttribute("aria-label", "View Details for " + restaurant.name);
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more);

  return li;
};

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = function addMarkersToMap() {
  var restaurants = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : self.restaurants;

  restaurants.forEach(function (restaurant) {
    // Add marker to the map
    var marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, "click", function () {
      window.location.href = marker.url;
    });
    self.markers.push(marker);
  });
};