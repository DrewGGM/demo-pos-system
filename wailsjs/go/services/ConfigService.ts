import { getStore } from '../../../src/services/mockBackend';
export async function GetRestaurantConfig() { return getStore('restaurant_config', {}); }
