import axios from 'axios';

const API_KEY = 'YOUR_FREE_API_KEY'; 

export const stockApi = axios.create({
  baseURL: 'https://www.alphavantage.co',
});

export const currencyApi = axios.create({
  baseURL: 'https://open.er-api.com/v6/latest',
});