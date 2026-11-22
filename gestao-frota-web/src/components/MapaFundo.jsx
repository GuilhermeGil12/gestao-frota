import { TileLayer } from 'react-leaflet';
import { useTheme } from '../context/ThemeContext';

// Mapa de fundo mais limpo que o padrão do OpenStreetMap (mesmos dados, desenho da CARTO):
// claro no tema claro e escuro no tema escuro. Uso gratuito com a atribuição abaixo.
const FUNDOS = {
    light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};

export default function MapaFundo() {
    const { tema } = useTheme();
    return (
        <TileLayer
            key={tema}
            url={FUNDOS[tema] ?? FUNDOS.light}
            subdomains="abcd"
            maxZoom={20}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
    );
}
