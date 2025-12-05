import React, { useCallback, useRef, useState } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Autocomplete,
  Marker,
} from "@react-google-maps/api";

const libraries = ["places"];

export default function RestaurantMap() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_KEY,
    libraries,
  });

  const [selectedPlace, setSelectedPlace] = useState(null);
  const autoRef = useRef();
  const mapRef = useRef();

  const onLoad = (map) => (mapRef.current = map);

  const handlePlaceChanged = () => {
    const place = autoRef.current.getPlace();

    if (!place.geometry) return;

    setSelectedPlace({
      placeId: place.place_id,
      name: place.name,
      location: place.geometry.location,
    });

    mapRef.current.panTo(place.geometry.location);
  };

  const handleCtrlClick = useCallback((e) => {
    if (!e.domEvent.ctrlKey) return;

    const service = new window.google.maps.places.PlacesService(mapRef.current);

    service.nearbySearch(
      {
        location: e.latLng,
        radius: 20,
        type: "restaurant",
      },
      (results) => {
        if (results && results.length > 0) {
          const r = results[0];
          setSelectedPlace({
            placeId: r.place_id,
            name: r.name,
            location: r.geometry.location,
          });
        }
      }
    );
  }, []);

  if (!isLoaded) return <div>Loading...</div>;

  return (
    <div>
      <Autocomplete
        onLoad={(auto) => (autoRef.current = auto)}
        onPlaceChanged={handlePlaceChanged}
        options={{
          types: ["restaurant"], // <-- restrict suggestions
        }}
      >
        <input
          type="text"
          placeholder="Search for restaurants…"
          style={{ width: "300px", height: "40px" }}
        />
      </Autocomplete>

      <GoogleMap
        onLoad={onLoad}
        onClick={handleCtrlClick}
        center={{ lat: 40.7128, lng: -74.006 }}
        zoom={13}
        mapContainerStyle={{ width: "100%", height: "80vh" }}
      >
        {selectedPlace && <Marker position={selectedPlace.location} />}
      </GoogleMap>

      {selectedPlace && (
        <div style={{ marginTop: "10px", padding: "10px" }}>
          <strong>Name:</strong> {selectedPlace.name} <br />
          <strong>Place ID:</strong> {selectedPlace.placeId}
        </div>
      )}
    </div>
  );
}
