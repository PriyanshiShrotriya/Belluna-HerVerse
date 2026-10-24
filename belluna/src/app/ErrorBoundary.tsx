import { Component, type ReactNode } from 'react';
export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div role="alert" className="p-8 text-center"><p>Something went wrong. / कुछ गड़बड़ हो गई।</p><button className="btn-primary mt-4" onClick={() => location.assign('/')}>Home</button></div>;
    return this.props.children;
  }
}
