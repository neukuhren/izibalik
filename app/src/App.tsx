import AppView from './view/AppView';
import { useApp } from './logic/useApp';

export default function App() {
  const v = useApp();
  return <AppView v={v} />;
}
