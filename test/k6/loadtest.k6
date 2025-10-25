import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 1, // 1 user
  duration: '10s', // 10 seconds
};

export default function () {
  const res = http.get('http://localhost:4567/');
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
}