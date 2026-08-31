import type { BusinessCategory, Coordinates, Territory } from "./types";

export const TERRITORIES: Territory[] = [
  { id: "manhattan", label: "Manhattan", state: "NY", city: "New York", bounds: { south: 40.7003, west: -74.0195, north: 40.882, east: -73.9067 } },
  { id: "brooklyn", label: "Brooklyn", state: "NY", city: "Brooklyn", bounds: { south: 40.5707, west: -74.0439, north: 40.7395, east: -73.833 } },
  { id: "queens", label: "Queens", state: "NY", city: "Queens", bounds: { south: 40.5429, west: -73.9626, north: 40.8007, east: -73.7002 } },
  { id: "bronx", label: "Bronx", state: "NY", city: "Bronx", bounds: { south: 40.7857, west: -73.9339, north: 40.9176, east: -73.7484 } },
  { id: "staten-island", label: "Staten Island", state: "NY", city: "Staten Island", bounds: { south: 40.4774, west: -74.2591, north: 40.6518, east: -74.052 } },
  { id: "jersey-city", label: "Jersey City", state: "NJ", city: "Jersey City", bounds: { south: 40.6665, west: -74.113, north: 40.769, east: -74.02 } },
  { id: "hoboken", label: "Hoboken", state: "NJ", city: "Hoboken", bounds: { south: 40.727, west: -74.043, north: 40.758, east: -74.015 } },
  { id: "newark", label: "Newark", state: "NJ", city: "Newark", bounds: { south: 40.673, west: -74.252, north: 40.787, east: -74.112 } },
  { id: "fort-lee", label: "Fort Lee", state: "NJ", city: "Fort Lee", bounds: { south: 40.833, west: -74.01, north: 40.874, east: -73.962 } },
  { id: "edgewater", label: "Edgewater", state: "NJ", city: "Edgewater", bounds: { south: 40.795, west: -74.01, north: 40.841, east: -73.972 } },
  { id: "englewood", label: "Englewood", state: "NJ", city: "Englewood", bounds: { south: 40.869, west: -74.022, north: 40.913, east: -73.954 } },
  { id: "hackensack", label: "Hackensack", state: "NJ", city: "Hackensack", bounds: { south: 40.855, west: -74.079, north: 40.908, east: -74.027 } },
  { id: "paramus", label: "Paramus", state: "NJ", city: "Paramus", bounds: { south: 40.9, west: -74.104, north: 40.97, east: -74.04 } },
  { id: "montclair", label: "Montclair", state: "NJ", city: "Montclair", bounds: { south: 40.793, west: -74.24, north: 40.861, east: -74.176 } },
  { id: "clifton", label: "Clifton", state: "NJ", city: "Clifton", bounds: { south: 40.819, west: -74.19, north: 40.906, east: -74.118 } },
  { id: "elizabeth", label: "Elizabeth", state: "NJ", city: "Elizabeth", bounds: { south: 40.64, west: -74.246, north: 40.698, east: -74.154 } },
  { id: "edison", label: "Edison", state: "NJ", city: "Edison", bounds: { south: 40.49, west: -74.43, north: 40.63, east: -74.3 } },
  { id: "new-brunswick", label: "New Brunswick", state: "NJ", city: "New Brunswick", bounds: { south: 40.465, west: -74.49, north: 40.515, east: -74.42 } },
  { id: "secaucus", label: "Secaucus", state: "NJ", city: "Secaucus", bounds: { south: 40.768, west: -74.09, north: 40.812, east: -74.036 } },
  { id: "weehawken", label: "Weehawken", state: "NJ", city: "Weehawken", bounds: { south: 40.758, west: -74.035, north: 40.785, east: -74.008 } },
];

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  { id: "dentists", label: "Dentists", query: "dentist", googleType: "dentist", value: "high" },
  { id: "med-spas", label: "Med spas", query: "medical spa", googleType: "spa", value: "high" },
  { id: "lawyers", label: "Lawyers", query: "lawyer", googleType: "lawyer", value: "high" },
  { id: "accountants", label: "Accountants", query: "accountant", googleType: "accounting", value: "high" },
  { id: "hvac", label: "HVAC", query: "HVAC contractor", googleType: "hvac_contractor", value: "high" },
  { id: "plumbers", label: "Plumbers", query: "plumber", googleType: "plumber", value: "high" },
  { id: "electricians", label: "Electricians", query: "electrician", googleType: "electrician", value: "high" },
  { id: "contractors", label: "Contractors", query: "general contractor", googleType: "general_contractor", value: "high" },
  { id: "movers", label: "Movers", query: "moving company", googleType: "moving_company", value: "medium" },
  { id: "cleaners", label: "Cleaners", query: "cleaning service", googleType: "cleaning_service", value: "medium" },
  { id: "auto-repair", label: "Auto repair", query: "auto repair", googleType: "auto_repair_shop", value: "medium" },
  { id: "salons", label: "Hair salons", query: "hair salon", googleType: "hair_salon", value: "medium" },
  { id: "barbers", label: "Barbers", query: "barber shop", googleType: "barber_shop", value: "medium" },
  { id: "nail-salons", label: "Nail salons", query: "nail salon", googleType: "nail_salon", value: "medium" },
  { id: "restaurants", label: "Restaurants", query: "restaurant", googleType: "restaurant", value: "medium" },
  { id: "pet-groomers", label: "Pet groomers", query: "pet groomer", googleType: "pet_groomer", value: "medium" },
  { id: "photographers", label: "Photographers", query: "photographer", googleType: "photographer", value: "medium" },
  { id: "tutors", label: "Tutors & training", query: "tutoring service", googleType: "educational_consultant", value: "medium" },
];

export function getTerritory(id: string): Territory {
  const territory = TERRITORIES.find((item) => item.id === id);
  if (!territory) throw new Error(`Unknown territory: ${id}`);
  return territory;
}

export function getCategory(id: string): BusinessCategory {
  const category = BUSINESS_CATEGORIES.find((item) => item.id === id);
  if (!category) throw new Error(`Unknown business category: ${id}`);
  return category;
}

export function createTerritoryGrid(territory: Territory, spacingMeters = 3500): Coordinates[] {
  const latitudeStep = spacingMeters / 111_320;
  const centerLatitude = (territory.bounds.south + territory.bounds.north) / 2;
  const longitudeStep = spacingMeters / (111_320 * Math.cos((centerLatitude * Math.PI) / 180));
  const cells: Coordinates[] = [];

  for (let latitude = territory.bounds.south; latitude <= territory.bounds.north; latitude += latitudeStep) {
    for (let longitude = territory.bounds.west; longitude <= territory.bounds.east; longitude += longitudeStep) {
      cells.push({ latitude: Number(latitude.toFixed(6)), longitude: Number(longitude.toFixed(6)) });
    }
  }

  const center = {
    latitude: (territory.bounds.south + territory.bounds.north) / 2,
    longitude: (territory.bounds.west + territory.bounds.east) / 2,
  };
  return cells.sort((a, b) => {
    const distanceA = (a.latitude - center.latitude) ** 2 + (a.longitude - center.longitude) ** 2;
    const distanceB = (b.latitude - center.latitude) ** 2 + (b.longitude - center.longitude) ** 2;
    return distanceA - distanceB;
  });
}
