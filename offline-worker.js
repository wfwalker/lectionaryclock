/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */


(function (self) {
  'use strict';

  // On install, cache resources and skip waiting so the worker won't
  // wait for clients to be closed before becoming active.
  self.addEventListener('install', function (event) {
    event.waitUntil(oghliner.cacheResources().then(function () {
      return self.skipWaiting();
    }));
  });

  // On activation, delete old caches and start controlling the clients
  // without waiting for them to reload.
  self.addEventListener('activate', function (event) {
    event.waitUntil(oghliner.clearOtherCaches().then(function () {
      return self.clients.claim();
    }));
  });

  // Retrieves the request following oghliner strategy.
  self.addEventListener('fetch', function (event) {
    if (event.request.method === 'GET') {
      event.respondWith(oghliner.get(event.request));
    } else {
      event.respondWith(self.fetch(event.request));
    }
  });

  var oghliner = self.oghliner = {

    // This is the unique prefix for all the caches controlled by this worker.
    CACHE_PREFIX: 'offline-cache:wfwalker/lectionaryclock:' + (self.registration ? self.registration.scope : '') + ':',

    // This is the unique name for the cache controlled by this version of the worker.
    get CACHE_NAME() {
      return this.CACHE_PREFIX + 'c29669c675e6dd58c3de798f7f28cd520d2a8317';
    },

    // This is a list of resources that will be cached.
    RESOURCES: [
      './', // cache always the current root to make the default page available
      './images/apple-touch-icon-114x114.png', // d18039f8fea99e40a95174ef9e9b1535bb31b19b
      './images/apple-touch-icon-120x120.png', // 2896b0be6873f681ecd2f340e7cf8291f3f8a4df
      './images/apple-touch-icon-144x144.png', // 05417d5990eff50a96104bf1c4d3120c9dd97b29
      './images/apple-touch-icon-152x152.png', // 4da31383950131aa91670eb896d47086044bdb13
      './images/apple-touch-icon-57x57.png', // 05d01de8b368c72fddf4e7586d231ca0b43868af
      './images/apple-touch-icon-60x60.png', // 6e19dde744cb62d4ec7b402ef5822a60f94390de
      './images/apple-touch-icon-72x72.png', // 357e78f8ea62af3a9dc9869ac797871799277b16
      './images/apple-touch-icon-76x76.png', // 8c81f23bd12150e31723405cb261aec8bb882961
      './images/favicon-128x128.png', // 5ab189c4e3a7091fb0588020e93ded3c146a7ecf
      './images/favicon-196x196.png', // 524d3c8e68cc7de2b8cf1ee293780758a9444ec7
      './images/favicon-96x96.png', // 7589187bf561d0ebb8fe12074c0d95d20d826bfd
      './images/mstile-144x144.png', // 1143726c60ee73b882af65e408745782282d618c
      './images/mstile-150x150.png', // 70afb464b27eb37de2af5ed8c9e6857444eb0895
      './images/mstile-310x150.png', // a8476b8ba5ea497c6acbc506ce416c616fe4f5da
      './images/mstile-310x310.png', // 1ead02d81c778d9162e7c51f479f4528c47c3d7c
      './images/mstile-70x70.png', // 6f75379a90f9615b823d57537ffa8eb1a0887702
      './images/next.png', // 942f3f721cc137fce5cc81cafa4e17119cc00100
      './images/prev.png', // edf7f52c4498b1effb7694f3df8faed4fac37f81
      './index.html', // dc497f5bf713deb525f18156bb50a5f20ed2d529
      './scripts/app.js', // 2388f8453b26601987f403b8c3843ac76b75b535
      './scripts/bundle.js', // 4c747b987d4ba8d4c557c4bfe7cd87911e179fdc
      './scripts/d3.v3.min.js', // 751927cc0f71697c6b6f680192ac84a6d7ff3787
      './scripts/main.js', // ebb75faf6f7e87caecc0e285253be2036df2ef1c
      './scripts/offline-manager.js', // e2e09e000c5b64035940ae44e9c0936eb25ecd51
      './styles/app.css', // 3d11135c4689ef03ce8ab28bc0856441eaa53340
      './styles/stylesheet.css', // 7997e49a29b051cadc22884144acdba1efdff492

    ],

    // Adds the resources to the cache controlled by this worker.
    cacheResources: function () {
      var now = Date.now();
      var baseUrl = self.location;
      return this.prepareCache()
      .then(function (cache) {
        return Promise.all(this.RESOURCES.map(function (resource) {
          // Bust the request to get a fresh response
          var url = new URL(resource, baseUrl);
          var bustParameter = (url.search ? '&' : '') + '__bust=' + now;
          var bustedUrl = new URL(url.toString());
          bustedUrl.search += bustParameter;

          // But cache the response for the original request
          var requestConfig = { credentials: 'same-origin' };
          var originalRequest = new Request(url.toString(), requestConfig);
          var bustedRequest = new Request(bustedUrl.toString(), requestConfig);
          return fetch(bustedRequest).then(function (response) {
            if (response.ok) {
              return cache.put(originalRequest, response);
            }
            console.error('Error fetching ' + url + ', status was ' + response.status);
          });
        }));
      }.bind(this));
    },

    // Remove the offline caches not controlled by this worker.
    clearOtherCaches: function () {
      var deleteIfNotCurrent = function (cacheName) {
        if (cacheName.indexOf(this.CACHE_PREFIX) !== 0 || cacheName === this.CACHE_NAME) {
          return Promise.resolve();
        }
        return self.caches.delete(cacheName);
      }.bind(this);

      return self.caches.keys()
      .then(function (cacheNames) {
        return Promise.all(cacheNames.map(deleteIfNotCurrent));
      });

    },

    // Get a response from the current offline cache or from the network.
    get: function (request) {
      return this.openCache()
      .then(function (cache) {
        return cache.match(request);
      })
      .then(function (response) {
        if (response) {
          return response;
        }
        return self.fetch(request);
      });
    },

    // Prepare the cache for installation, deleting it before if it already exists.
    prepareCache: function () {
      return self.caches.delete(this.CACHE_NAME).then(this.openCache.bind(this));
    },

    // Open and cache the offline cache promise to improve the performance when
    // serving from the offline-cache.
    openCache: function () {
      if (!this._cache) {
        this._cache = self.caches.open(this.CACHE_NAME);
      }
      return this._cache;
    }

  };
}(self));
