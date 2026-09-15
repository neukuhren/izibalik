// Базовый класс логики: state + merge-setState + уведомление об изменении.
export class Logic<S = Record<string, unknown>, P = Record<string, unknown>> {
  state!: S;
  props: P;
  private listener: (() => void) | null = null;

  constructor(props: P) {
    this.props = props;
  }

  setState(partial: Partial<S>): void {
    this.state = { ...this.state, ...partial };
    this.listener?.();
  }

  subscribe(listener: () => void): void {
    this.listener = listener;
  }

  componentDidMount(): void {}
  componentWillUnmount(): void {}
}
