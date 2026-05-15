import { AiProductUploader } from '@/components/atelier/AiProductUploader';

export const metadata = {
  title: 'AI Upload Prodotto',
  description:
    'Carica foto da smartphone e genera automaticamente bozza prodotto con layout immagini ottimizzato.',
};

export default function AiUploadPage() {
  return <AiProductUploader />;
}
