import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";

// Correção do bug dos ícones do Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Componente interno que escuta cliques no mapa
function CliqueMapa({ onMover }) {
    useMapEvents({
        click(e) {
            onMover({ lat: e.latlng.lat, lng: e.latlng.lng });
        }
    });
    return null;
}

function MapaPicker({ posicao, onMover }) {
    return (
        <MapContainer
            center={[posicao.lat, posicao.lng]}
            zoom={16}
            style={{ height: "300px", width: "100%", borderRadius: "8px" }}
        >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <CliqueMapa onMover={onMover} />
            <Marker
                position={[posicao.lat, posicao.lng]}
                draggable={true}
                eventHandlers={{
                    dragend(e) {
                        const { lat, lng } = e.target.getLatLng();
                        onMover({ lat, lng });
                    }
                }}
            />
        </MapContainer>
    );
}

export default MapaPicker;