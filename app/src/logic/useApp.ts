import { useEffect, useReducer, useRef } from 'react';
import { PrototypeLogic } from './prototypeLogic';

export interface AppConfig {
  scanlines: boolean;
  shopPaused: boolean;
  supplierLow: boolean;
}

const DEFAULT_CONFIG: AppConfig = { scanlines: true, shopPaused: false, supplierLow: true };

// Loose on purpose: renderVals живёт в prototypeLogic (@ts-nocheck).
// Will become a real interface when logic is split during backend integration.
export type Vals = Record<string, any>;

export function useApp(config: AppConfig = DEFAULT_CONFIG): Vals {
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const logic = useRef<PrototypeLogic | null>(null);
  if (!logic.current) {
    logic.current = new PrototypeLogic(config);
    logic.current.subscribe(rerender);
  }

  useEffect(() => {
    const l = logic.current!;
    l.componentDidMount();
    return () => l.componentWillUnmount();
  }, []);

  return logic.current.renderVals();
}
