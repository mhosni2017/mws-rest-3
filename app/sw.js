/*import idb from "idb";*/
self.importScripts('idb.js');
/* code used here from the udacity course and google developers Caching Files with Service Worker samples*/

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

let staticCacheName = 'mws-restaurant-cache-1';
var allCaches = [
  staticCacheName
];
let urlsToCache = [
  '/index.html',
  '/restaurant.html',
  'css/styles.css',
  'js/main.js',
  'js/dbhelper.js',
  'js/restaurant_info.js'
];


self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(staticCacheName).then(function(cache) {
      console.log("inside install")
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', function(event) {
  console.log("inside activate")
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(cacheName) {
          return cacheName.startsWith('mws-') &&
                 !allCaches.includes(cacheName);
        }).map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

// Requests going to the API get handled separately from those // going to other destirations twist
self.addEventListener('fetch', function(event) {
  let cacheRequest = event.request;
  let requestUrl = new URL(event.request.url);
  if (event.request.url.indexOf("restaurant.html") >-1 ) {
    const cacheURL = "restaurant.html";
    cacheRequest = new Request(cacheURL);
  }
  if (requestUrl.port ==='1337') {
   const parts = requestUrl.pathname.split("/");
   const id = parts[parts.length - 1] === "restaurants" ? "-1" : parts[parts.length - 1];
      handleAJAXEvent(event, id);
    } else { handleNonAJAXEvent(event,cacheRequest);
    }
 }) ;

const handleAJAXEvent = (event, id) => { // Check the IndexedDB to see if the JSON for the API
event.respondWith( dbPromise.db.then(db => {
    return db.transaction("restaurants").objectStore("restaurants").get(id);
    }).then(data => {
    return ( (data && data.data) || fetch(event.request).then(fetchResponse => fetchResponse.json()).then(
      json => {
        return dbPromise.db.then(db => {
          const tx = db.transaction("restaurants","readwrite");
          tx.objectStore("restaurants").put({
            id: id,
            data: json
          });
          return json; }); })
        ); }).then( finalResponse=> {
             return new Response(JSON.stringify(finalResponse));
          }).catch(error => { return new Response("Frror fetching data", { status: 500});
        })
      ); };

const handleNonAJAXEvent = (event,cacheRequest) => {

  event.respondWith(
    caches.open(staticCacheName).then(function(cache) {
      return caches.match(cacheRequest).then(function(response) {
        return response || fetch(event.request).then(function(response) {
          cache.put(event.request, response.clone());
          return response;
        });
      }).catch( error=> {
        if (event.request.url.indexOf(".jpg">=1)) {
          return caches.match("/img/na.png");
        }
        return new Response (
          "Application is not connected to internet" ,
           {
             status: 404,
             statusText : "Application is not connected to internet"
           }

        );
        })

    })
  );
};
