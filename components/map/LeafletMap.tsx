"use client";

import { MapContainer, TileLayer, Marker, ZoomControl, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect, useRef } from "react";

const pinIcon = L.divIcon({
  className: "",
  html: '<svg width="30" height="40" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg"><path d="M16 0C7.2 0 0 7.2 0 16c0 11 16 26 16 26s16-15 16-26C32 7.2 24.8 0 16 0z" fill="#e11d2e"/><circle cx="16" cy="16" r="6" fill="#fff"/></svg>',
  iconSize: [30, 40],
  iconAnchor: [15, 40],
});

export type LatLng = { latitude: number; longitude: number };

function ClickHandler({ onPick }: { onPick: (pos: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onPick({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    },
  });
  return null;
}

function Recenter({ center }: { center: LatLng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.latitude, center.longitude], map.getZoom());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.latitude, center.longitude]);
  return null;
}

export default function LeafletMap({
  center,
  position,
  mapStyle,
  onPick,
}: {
  center: LatLng;
  position: LatLng | null;
  mapStyle: "satellite" | "street";
  onPick: (pos: LatLng) => void;
}) {
  const markerRef = useRef<L.Marker | null>(null);

  const tileUrl =
    mapStyle === "satellite"
      ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const attribution =
    mapStyle === "satellite"
      ? "Tiles &copy; Esri"
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  return (
    <MapContainer center={[center.latitude, center.longitude]} zoom={13} zoomControl={false} className="h-full w-full">
      <ZoomControl position="topleft" />
      <TileLayer url={tileUrl} attribution={attribution} />
      <ClickHandler onPick={onPick} />
      <Recenter center={center} />
      {position && (
        <Marker
          position={[position.latitude, position.longitude]}
          icon={pinIcon}
          draggable
          ref={markerRef}
          eventHandlers={{
            dragend: () => {
              const marker = markerRef.current;
              if (marker) {
                const { lat, lng } = marker.getLatLng();
                onPick({ latitude: lat, longitude: lng });
              }
            },
          }}
        />
      )}
    </MapContainer>
  );
}
