import { AtlasDemo } from '@/components/public/atlas-demo';
import { Faq } from '@/components/public/faq';
import { Features } from '@/components/public/features';
import { Hero } from '@/components/public/hero';
import { Pricing } from '@/components/public/pricing';
import { StudyJourney } from '@/components/public/study-journey';

export default function HomePage() {
  return <div className="public-home"><Hero /><Features /><AtlasDemo /><StudyJourney /><Pricing /><Faq /></div>;
}
