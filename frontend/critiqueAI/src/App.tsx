import {
  Box,
  Button,
  ButtonGroup,
  Flex,
  HStack,
  IconButton,
  Input,
  SkeletonText,
  Text,
} from "@chakra-ui/react";
import { FaLocationArrow, FaTimes } from "react-icons/fa";
import { useRef, useState } from "react";

import {
  useJsApiLoader,
  GoogleMap,
  Autocomplete,
} from "@react-google-maps/api";

// Fix autocomplete dropdown z-index
const autocompleteStyle = `
  .pac-container {
    z-index: 10000 !important;
  }
`;

const center = { lat: 47.4979, lng: 19.0402 };
const libraries: "places"[] = ["places"];

function App() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_API_KEY,
    libraries,
  });

  const [mapCenter, setMapCenter] = useState(center);
  const [mapZoom, setMapZoom] = useState(13);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [selectedPlace, setSelectedPlace] =
    useState<google.maps.places.PlaceResult | null>(null);

  const onPlaceChanged = () => {
    const autocomplete = autocompleteRef.current;
    if (autocomplete) {
      const place = autocomplete.getPlace();
      console.log("Place selected:", place);

      if (place.geometry?.location) {
        setSelectedPlace(place);
        setMapCenter({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        });
        setMapZoom(25);
      }
    }
  };
  if (!isLoaded) {
    return <SkeletonText w="100vw" padding="6" />;
  }

  return (
    <>
      <style>{autocompleteStyle}</style>
      <Flex
        position="relative"
        flexDirection="column"
        alignItems="center"
        bgColor="blue.200"
        bgPos="bottom"
        h="100vh"
        w="100vw"
      >
        <Box position="absolute" left={0} top={0} h="100%" w="100%">
          <GoogleMap
            center={mapCenter}
            zoom={mapZoom}
            mapContainerStyle={{ width: "100%", height: "100%" }}
            options={{
              fullscreenControl: false,
              streetViewControl: false,
              mapTypeControl: false,
            }}
          >
            {" "}
          </GoogleMap>
        </Box>

        <Box
          p={4}
          borderRadius="lg"
          mt={4}
          bgColor="white"
          shadow="base"
          minW="container.md"
          zIndex="tooltip"
          position="relative"
        >
          <HStack spacing={4} zIndex="tooltip">
            <Box flex={1} position="relative" zIndex="tooltip">
              <Autocomplete
                onLoad={(autocomplete) => {
                  autocompleteRef.current = autocomplete;
                }}
                onPlaceChanged={onPlaceChanged}
              >
                <Input placeholder="Search for a place" />
              </Autocomplete>
            </Box>
            <ButtonGroup>
              <Button colorScheme="pink" onClick={onPlaceChanged}>
                Show Location
              </Button>
              <IconButton
                aria-label="center back"
                icon={<FaTimes />}
                onClick={() => alert(123)}
              />
            </ButtonGroup>
          </HStack>
          {/* <HStack spacing={4} mt={4} justifyContent="space-between">
          <Text>Distance: </Text>
          <Text>Duration: </Text>
          <IconButton
            aria-label="center back"
            icon={<FaLocationArrow />}
            isRound
            onClick={() => alert(123)}
          />
        </HStack> */}
        </Box>
      </Flex>
    </>
  );
}

export default App;
