/*import idb from "idb";*/
self.importScripts('idb.js');
/* code used here from the udacity course and google developers Caching Files with Service Worker samples*/

const dbPromise = {
  db: idb.open('rest-db', 3, upgradeDb => {
    switch (upgradeDb.oldVersion) {
      case 0:
        upgradeDb.createObjectStore('restaurants', { keyPath: 'id' });
      case 1:
        upgradeDb.createObjectStore('reviews', { keyPath: 'id' , autoIncrement: true })
          .createIndex('restaurant_id', 'restaurant_id');
      case 2:
        upgradeDb.createObjectStore('pendingfavorite', { keyPath: "id", autoIncrement: true });
        upgradeDb.createObjectStore('pendingreviews', { keyPath: "id", autoIncrement: true });
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
  'js/restaurant_info.js',
  'img/*.jpg',
  'icons/*.png'
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
                 !allCaches.includes(staticCacheName);
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
    console.log("in event listner restaurant.html");
  }
  if (requestUrl.port ==='1337') {
   console.log("in event listner port 1337");
   const parts = requestUrl.pathname.split("/");
   const id = parts[parts.length - 1] === "restaurants" ? "-1" : parts[parts.length - 1];
   console.log("in event listner port 1337:"+id);
      handleAJAXEvent(event, id);
    } else { handleNonAJAXEvent(event,cacheRequest);
    }
 }) ;


 self.addEventListener('sync', function(event) {
   console.log("in sync");
   if (event.tag == 'favoriteSync') {
     event.waitUntil(favoriteSyncFunction());
   }
 });

 self.addEventListener('sync', function(event) {
   console.log("in sync");
   if (event.tag == 'reviewSync') {
     event.waitUntil(reviewSyncFunction());
   }
 });

 function favoriteSyncFunction() {
   console.log("in rs");
   dbPromise.db.then(db => {
     const store = db.transaction('pendingfavorite', 'readwrite').objectStore('pendingfavorite');
            return store.getAll();
       }).then(data=>{
         console.log("fs data:"+data);
         console.log("fs data.length:"+data.length);
         // not needed , won't implement
       });
 }

 function reviewSyncFunction() {
   console.log("rs data:");
   dbPromise.db.then(db => {
     const store = db.transaction('pendingreviews', 'readwrite').objectStore('pendingreviews');
            return store.getAll();
       }).then(data=>{
         console.log("rs data:"+data);
         console.log("rs data.length:"+data.length);
         //console.log("rs data.result:"+data.result);
         //console.log("fs data.target:"+data.target.result);
         data.map( d => {
           const review = d.reviews;
           const url = `${DBHelper.API_URL}/reviews/`;
           const POST = {
             method: 'POST',
             body: JSON.stringify(review)
           };
           fetch(url, POST).then(response => {
             if (!response.ok) return Promise.reject("Couldn't post review to server.");
             store.delete(d.id);
             return response.json();
           });
         });
       });
  }

const handleAJAXEvent = (event, id) => { // Check the IndexedDB to see if the JSON for the API
event.respondWith( dbPromise.db.then(db => {
    console.log("in ajax db id:"+id);
    if (id=="-1") {
        let allObjects = db.transaction("restaurants").objectStore("restaurants").getAll();
        console.log("all:"+allObjects);
        return allObjects;
    } else
     {
      console.log("all in:"+id);
      let allObjects = db.transaction("restaurants").objectStore("restaurants").get(Number(id));
      console.log("all:"+allObjects);
      return allObjects;
    }


    }).then(data => {
    console.log("in ajax data:"+data);
    console.log(" event method:"+event.request.method);


    console.log("in try");
    return fetch(event.request,{method: event.request.method}).then(
      fetchResponse => {
      let FRJSON = fetchResponse.json()
      console.log("in ajax json:"+FRJSON);
        return FRJSON;
      }
      ).catch (e => {
      console.log("in catch");
      let rq = data;
      console.log("in catch:"+rq);
      //rq = rq.json();

      return rq;
      });

    }).then( finalResponse=> {
             console.log("in ajax finalResponse:"+finalResponse);
             return new Response(JSON.stringify(finalResponse));
          }).catch(error => {
            console.log(error);
            return new Response("Error fetching data", { status: 200});
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
             status: 200,
             statusText : "Application is not connected to internet"
           }

        );
        })

    })
  );
};
