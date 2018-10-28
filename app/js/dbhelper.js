/**
 * Common database helper functions.
 */

/*self.importScripts('idb.js');*/
const dbPromise = {
  db: idb.open('rest-db', 2, upgradeDb => {
    switch (upgradeDb.oldVersion) {
      case 0:
        upgradeDb.createObjectStore('restaurants', { keyPath: 'id' });
      case 1:
        upgradeDb.createObjectStore('reviews', { keyPath: 'id' })
          .createIndex('restaurant_id', 'restaurant_id');
    }
  })};

  function handleClick(button) {
   const restaurantId = button.dataset.id;
   const fav = button.getAttribute('aria-pressed') == 'true';
   console.log("fav in"+fav);
   const url = `${DBHelper.API_URL}/restaurants/${restaurantId}/?is_favorite=${!fav}`;
   const PUT = {method: 'PUT'};
   console.log("in click:"+restaurantId);
   // TODO: use Background Sync to sync data with API server
   return fetch(url, PUT).then(response => {
     if (!response.ok) return Promise.reject("We couldn't mark restaurant as favorite.");
     return response.json();
   }).then(updatedRestaurant => {
     // update restaurant on idb
     DBHelper.putRestaurants(updatedRestaurant, true);
     // change state of toggle button
     console.log("fav out"+fav);
     button.setAttribute('aria-pressed', !fav);
     console.log("aria:"+button.getAttribute('aria-pressed'));
     console.log("fav not"+!fav);
   });
 }


  function favoriteButton(restaurant) {
   const button = document.createElement('button');
   button.innerHTML = "&#x2764;"; // this is the heart symbol in hex code
   button.className = "fav";
   button.dataset.id = restaurant.id; // store restaurant id in dataset for later
   button.setAttribute('aria-label', `Mark ${restaurant.name} as a favorite`);
   button.setAttribute('aria-pressed', restaurant.is_favorite);
   button.onclick = function() { handleClick(button); }
   //button.addEventListener("click", DBHelper.handleClick(button,event));
   return button;
 }

class DBHelper {

  /**
   * API URL.
   * Change this to restaurants.json file location on your server.
   */
  static get API_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}`;
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback, id) {
    //let xhr = new XMLHttpRequest();

    console.log(id);

    let fetchURL;
    if (!id) {
      fetchURL = `${DBHelper.API_URL}/restaurants`;
      }  else {
        fetchURL=`${DBHelper.API_URL}/restaurants/${id}`;
      }
      fetch(fetchURL, {method: 'GET'}).then(response=> {
          console.log(fetchURL);
          console.log(response);
          response.json().then(restaurants=> {
              console.log('Restaurant JSON:', restaurants);
              callback(null,restaurants);
          }).catch(error=> {
            callback(`Request failed. Returned ${error}`, null);
          });
      }).catch(error=> {
        callback(`Request failed. Returned ${error}`, null);
      });

  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    console.log("byid:"+id);
    let restaurant;
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        if (restaurants.length>1) {
          console.log("Rest len >1");
          restaurant = restaurants.find(r => r.id == id);
        }
        else {
          console.log("Rest len <=1");
          restaurant = restaurants;
          console.log(restaurant);
        }
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    },id);
  }

  static fetchReviewsByRestaurantId(restaurant_id) {
      return fetch(`${DBHelper.API_URL}/reviews/?restaurant_id=${restaurant_id}`).then(response => {
        if (!response.ok) return Promise.reject("Reviews couldn't be fetched from network");
        return response.json();
      }).then(fetchedReviews => {
        // if reviews could be fetched from network:
        // store reviews on idb
        DBHelper.putReviews(fetchedReviews);
        return fetchedReviews;
      }).catch(networkError => {
        // if reviews couldn't be fetched from network:
        // try to get reviews from idb
        console.log(`${networkError}, trying idb.`);
      return DBHelper.getReviewsForRestaurant(restaurant_id).then(idbReviews => {
        // if no reviews were found on idb return null
        if (idbReviews.length < 1) return null; // return null to handle error,  there are no reviews.
        return idbReviews;
      });
      });
    }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.photograph}`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  }

  static putRestaurants(restaurants, forceUpdate = false) {
      if (!restaurants.push) restaurants = [restaurants];
      return dbPromise.db.then(db => {
        const store = db.transaction('restaurants', 'readwrite').objectStore('restaurants');
        Promise.all(restaurants.map(networkRestaurant => {
          return store.get(networkRestaurant.id).then(idbRestaurant => {
            if (forceUpdate) return store.put(networkRestaurant);
            if (!idbRestaurant || new Date(networkRestaurant.updatedAt) > new Date(idbRestaurant.updatedAt)) {
              return store.put(networkRestaurant);
            }
          });
        })).then(function () {
          return store.complete;
        });
      });
    };


  static  getRestaurants(id = undefined) {
      return dbPromise.db.then(db => {
        const store = db.transaction('restaurants').objectStore('restaurants');
        if (id) return store.get(Number(id));
        return store.getAll();
      });
    };

  static putReviews(reviews) {
    if (!reviews.push) reviews = [reviews];
    return dbPromise.db.then(db => {
      const store = db.transaction('reviews', 'readwrite').objectStore('reviews');
      Promise.all(reviews.map(networkReview => {
        return store.get(networkReview.id).then(idbReview => {
          if (!idbReview || new Date(networkReview.updatedAt) > new Date(idbReview.updatedAt)) {
            return store.put(networkReview);
          }
        });
      })).then(function () {
        return store.complete;
      });
    });
  };

  /**
   * Get all reviews for a specific restaurant, by its id, using promises.
   */
  static getReviewsForRestaurant(id) {
    return dbPromise.db.then(db => {
      const storeIndex = db.transaction('reviews').objectStore('reviews').index('restaurant_id');
      return storeIndex.getAll(Number(id));
    });
  };

  static createReviewHTML(review) {
    const li = document.createElement('li');
    const name = document.createElement('p');
    name.innerHTML = review.name;
    li.appendChild(name);

    const date = document.createElement('p');
    date.innerHTML = new Date(review.createdAt).toLocaleDateString();
    li.appendChild(date);

    const rating = document.createElement('p');
    rating.innerHTML = `Rating: ${review.rating}`;
    li.appendChild(rating);

    const comments = document.createElement('p');
    comments.innerHTML = review.comments;
    li.appendChild(comments);

    return li;
  }

  /**
   * Clear form data
   */
  static clearForm() {
    // clear form data
    document.getElementById('name').value = "";
    document.getElementById('rating').selectedIndex = 0;
    document.getElementById('comments').value = "";
  }

  /**
   * Make sure all form fields have a value and return data in
   * an object, so is ready for a POST request.
   */
  static validateAndGetData() {
    const data = {};

    // get name
    let name = document.getElementById('name');
    if (name.value === '') {
      name.focus();
      return;
    }
    data.name = name.value;

    // get rating
    const ratingSelect = document.getElementById('rating');
    const rating = ratingSelect.options[ratingSelect.selectedIndex].value;
    if (rating == "--") {
      ratingSelect.focus();
      return;
    }
    data.rating = Number(rating);

    // get comments
    let comments = document.getElementById('comments');
    if (comments.value === "") {
      comments.focus();
      return;
    }
    data.comments = comments.value;

    // get restaurant_id
    let restaurantId = document.getElementById('review-form').dataset.restaurantId;
    data.restaurant_id = Number(restaurantId);

    // set createdAT
    data.createdAt = new Date().toISOString();

    return data;
  }

  /**
   * Handle submit.
   */
  static handleRSubmit(e) {
    e.preventDefault();
    const review = DBHelper.validateAndGetData();
    if (!review) return;

    console.log(review);

    const url = `${DBHelper.API_URL}/reviews/`;
    const POST = {
      method: 'POST',
      body: JSON.stringify(review)
    };

    // TODO: use Background Sync to sync data with API server
    return fetch(url, POST).then(response => {
      if (!response.ok) return Promise.reject("Couldn't post review to server.");
      return response.json();
    }).then(newNetworkReview => {
      // save new review on idb
      DBHelper.putReviews(newNetworkReview);
      // post new review on page
      const reviewList = document.getElementById('reviews-list');
      const review = DBHelper.createReviewHTML(newNetworkReview);
      reviewList.appendChild(review);
      // clear form
      DBHelper.clearForm();
    });

  }

  /**
   * Returns a form element for posting new reviews.
   */
    static reviewForm(restaurantId) {
    const form = document.createElement('form');
    form.id = "review-form";
    form.dataset.restaurantId = restaurantId;

    let p = document.createElement('p');
    const name = document.createElement('input');
    name.id = "name"
    name.setAttribute('type', 'text');
    name.setAttribute('aria-label', 'Name');
    name.setAttribute('placeholder', 'Enter Your Name');
    p.appendChild(name);
    form.appendChild(p);

    p = document.createElement('p');
    const selectLabel = document.createElement('label');
    selectLabel.setAttribute('for', 'rating');
    selectLabel.innerText = "Your rating: ";
    p.appendChild(selectLabel);
    const select = document.createElement('select');
    select.id = "rating";
    select.name = "rating";
    select.classList.add('rating');
    ["--", 1,2,3,4,5].forEach(number => {
      const option = document.createElement('option');
      option.value = number;
      option.innerHTML = number;
      if (number === "--") option.selected = true;
      select.appendChild(option);
    });
    p.appendChild(select);
    form.appendChild(p);

    p = document.createElement('p');
    const textarea = document.createElement('textarea');
    textarea.id = "comments";
    textarea.setAttribute('aria-label', 'comments');
    textarea.setAttribute('placeholder', 'Enter any comments here');
    textarea.setAttribute('rows', '5');
    p.appendChild(textarea);
    form.appendChild(p);

    p = document.createElement('p');
    const addButton = document.createElement('button');
    addButton.setAttribute('type', 'submit');
    addButton.setAttribute('aria-label', 'Add Review');
    addButton.classList.add('add-review');
    addButton.innerHTML = "<span>Add your review</span>";
    p.appendChild(addButton);
    form.appendChild(p);

    form.onsubmit = DBHelper.handleRSubmit;

    return form;
  };


}
