let placeSearch, autocomplete;
const componentForm = {
    street_number: 'short_name',
    route: 'long_name',
    locality: 'long_name',
    administrative_area_level_1: 'short_name',
    country: 'long_name',
    postal_code: 'short_name'
};

function initAutocomplete() {
    // Create the autocomplete object, restricting the search to geographical
    // location types.
    autocomplete = new google.maps.places.Autocomplete(
    /** @type {!HTMLInputElement} */(document.getElementById('query')),
        { types: ['geocode'] });
    // When the user selects an address from the dropdown, populate the address
    // fields in the form.
    autocomplete.addListener('place_changed', fillInAddress);
}

function fillInAddress() {
    // Get the place details from the autocomplete object.
    var place = autocomplete.getPlace();
    for (var component in componentForm) {
        document.getElementById(component).value = '';
        document.getElementById(component).disabled = false;
    }
    // Get each component of the address from the place details
    // and fill the corresponding field on the form.
    for (var i = 0; i < place.address_components.length; i++) {
        var addressType = place.address_components[i].types[0];
        if (componentForm[addressType]) {
            var val = place.address_components[i][componentForm[addressType]];
            document.getElementById(addressType).value = val;
        }
    }
}
function renderHtml(state) {
    const resultTemplate = state.searchResults.map(function (items) {
      return (`
        <div class = "listen">
          <div class='individual-result' id='${items.id}'>
            <p class = "hospital-name">${items.name}</p>
            <p>${items.vicinity}</p>
            ${renderOpenNow(items)}
          </div>
        </div>
      `);
    });
    //<img src='${items.photos()}'>
    $('.results').html(resultTemplate);
    $('.rateYo').each(function (i, elem) {
      if (elem.dataset.rating !== 'undefined') {
        $(elem).rateYo({
          rating: elem.dataset.rating,
          readOnly: true
        });

      }
    });
    $('.loading').addClass('hidden');
    $('.results').removeClass('hidden');
    // $("html, body").animate({ scrollTop: $('#map').offset().top }, 1000);
  }
  function initMap() {
      let map, geocoder, marker;
      const centerInitialMap = { lat: 39.8097, lng: -98.5556 };
      map = new google.maps.Map(document.getElementById('map'), {
        zoom: 3,
        center: centerInitialMap
      });
      geocoder = new google.maps.Geocoder();
    }

    function renderOpenNow(item) {
        if (item.opening_hours !== undefined) {
            return (`
            <p class="available">Open now!</p>
         `)
        } else {
            return (`
            <p class="unavailable">Closed</p>
          `)
        }
    }

    function smoothMarkerScroll(item) {
        console.log(item)
        $("html, body").animate({ scrollTop: $('#map').offset().top }, 1000);
    }

    function addPlaceMarkers(state) {
        const markers = state.searchResults.map(function (items) {
            return {
                id: items.id,
                lat: items.geometry.location.lat(),
                lng: items.geometry.location.lng(),
                name: items.name,
                vicinity: items.vicinity
            };
        });
        appState.resultMarkers = markers;

        // centers map on geolocation from state
        const map = new google.maps.Map(document.getElementById('map'), {
            center: { lat: state.geoLocation[0], lng: state.geoLocation[1] },
            zoom: 10
        });


        for (let i = 0; i < markers.length; i++) {
            const position = new google.maps.LatLng(markers[i].lat, markers[i].lng);

            const contentString = `<div class="info-window">
          <a href="#${markers[i].id}" class="marker">${markers[i].name}</a>
          <p>${markers[i].vicinity}</p>
          </div>`;

            // console.log('markers i', markers[i]);
            const renderPlaceMarker = new google.maps.Marker({
                content: contentString,
                position: position,
                map: map,
                title: markers[i][0]
            });
            // console.log('place markers content', contentString);

            //makes all markers display on map without scrolling
            const latlngbounds = new google.maps.LatLngBounds();
            for (let x = 0; x < markers.length; x++) {
                latlngbounds.extend(markers[x]);
            }
            map.fitBounds(latlngbounds);

            const infowindow = new google.maps.InfoWindow({
                content: contentString
            });

            // function getInfoWindowEvent(marker) {
            //     infowindow.close()
            //     infowindow.setContent("This is where my HTML content goes.");
            //     infowindow.open(map, marker);
            // }
            renderPlaceMarker.addListener('click', function () {
                infowindow.close();
                infowindow.open(map, renderPlaceMarker);
            });
        }
    }

    //-- INITIAL STATE
    const appState = {
      apiKey: 'AIzaSyAhzMPUFxKG3VTooZrZ0ZKU_9zy3cCWJJE',
      geoLocation: [],
      resultMarkers: [],
      searchResults: [],
      userInput: null
    };

    const requestSearchResults = (state, input, callback) => {
      // zip code must be converted to geocode for API request and map display
      const baseURL = 'https://maps.googleapis.com/maps/api';
      const geocodeURL = `${baseURL}/geocode/json?address=${input}&key=${state.apiKey}`;
      // geocode API request
      $.getJSON(geocodeURL, data => {
        //adds geocode to state
        const location = data.results[0].geometry.location;
        //creates new location object using place libary and assign it to a variable
        const focus = new google.maps.LatLng(location.lat, location.lng);
        //pushes lat/long into state
        state.geoLocation = [location.lat, location.lng];
        //required for PlacesService function
        // sets where to make Google Places request
        const googlePlaces = new google.maps.places.PlacesService(map);
        const request = {
          location: focus,
          radius: '1000',
          types: ['cafe']
        };
        //Google Places API request
        googlePlaces.nearbySearch(request, (results, status) => {
          appState.searchResults = results;
          // console.log('place results', results);
          callback(appState);
          addPlaceMarkers(appState);
        });
        $('.map-container').removeClass('hidden');
      });
    };
    // STATE MODS
    function setUserInput(state, userInput) {
      state.userInput = userInput;
    }
    // EVENTS
    function submitData(event) {
      event.preventDefault();
      $('.loading').removeClass('hidden');
      const userInput = $(event.currentTarget).find('input').val();
      setUserInput(appState, userInput);
      requestSearchResults(appState, userInput, renderHtml);

    }
    function eventHandling() {
      $('.search-bar').submit(function (event) {
        submitData(event);
      });

      $('#query').keydown(function (event) {
        if (event.keyCode === 13) {
          $('.search-bar').submit();
        }
      });
    }
    // DOCUMENT READY FUNCTIONS
    $(function () {
      eventHandling();
    });
