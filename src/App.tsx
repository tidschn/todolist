import { useState, type ComponentType } from 'react';
import { Banners } from './ui/Banners';
import { Celebrations } from './ui/Celebrations';
import { Header } from './ui/Header';
import { Nav, type TabId } from './ui/Nav';
import { Today } from './ui/Today';

const SCREENS: Record<TabId, ComponentType> = {
  today: Today,
};

export default function App() {
  const [tab, setTab] = useState<TabId>('today');
  const Screen = SCREENS[tab];
  return (
    <div className="app">
      <Banners />
      <Header />
      <main>
        <Screen />
      </main>
      <Nav tab={tab} onChange={setTab} />
      <Celebrations />
    </div>
  );
}
