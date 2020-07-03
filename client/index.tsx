import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { DashboardContainer } from './containers/Dashboard';

const element = document.getElementById('dashboard');
if (element) {
  ReactDOM.render(<DashboardContainer />, element);
}
