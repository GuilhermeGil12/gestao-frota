import { TileLayer } from 'react-leaflet';
import { useTheme } from '../context/ThemeContext';

// Mapa de fundo do OpenStreetMap (gratuito, sem chave).
// No tema escuro, o mesmo mapa é escurecido por um filtro de cor do navegador (classe "mapa-escuro"),
// sem depender de outro serviço.
export default function MapaFundo() {
    const { tema } = useTheme();
    return (
        <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
            className={tema === 'dark' ? 'mapa-escuro' : ''}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
    );
}
