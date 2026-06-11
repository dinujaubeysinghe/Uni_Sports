const API_BASE = (import.meta.env.VITE_API_URL ?? "https://unisports-8upjo.ondigitalocean.app").replace(/\/$/, "");


export const sportsService = {
  getAll: async () => {
    try {
      const res = await fetch(`${API_BASE}/api/sports`);
      const data = await res.json();
      return data.data || [];
    } catch (error) {
      console.error("Error fetching sports:", error);
      return [];
    }
  },
  getById: async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/sports/${id}`);
      const data = await res.json();
      return data.data;
    } catch (error) {
      console.error("Error fetching sport:", error);
      return null;
    }
  },
};

export const coachService = {
  getAll: async () => {
    try {
      const res = await fetch(`${API_BASE}/api/users?role=coach`);
      const data = await res.json();
      return data.data || [];
    } catch (error) {
      console.error("Error fetching coaches:", error);
      return [];
    }
  },
  getById: async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/users/${id}`);
      const data = await res.json();
      return data.data;
    } catch (error) {
      console.error("Error fetching coach:", error);
      return null;
    }
  },
};

export const studentService = {
  getAll: async () => {
    try {
      const res = await fetch(`${API_BASE}/api/users?role=student`);
      const data = await res.json();
      return data.data || [];
    } catch (error) {
      console.error("Error fetching students:", error);
      return [];
    }
  },
  getById: async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/users/${id}`);
      const data = await res.json();
      return data.data;
    } catch (error) {
      console.error("Error fetching student:", error);
      return null;
    }
  },
};

export const sessionService = {
  getAll: async () => {
    try {
      const res = await fetch(`${API_BASE}/api/sessions`);
      const data = await res.json();
      return data.data || [];
    } catch (error) {
      console.error("Error fetching sessions:", error);
      return [];
    }
  },
  getByCoach: async (coachId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/sessions?coachId=${coachId}`);
      const data = await res.json();
      return data.data || [];
    } catch (error) {
      console.error("Error fetching coach sessions:", error);
      return [];
    }
  },
  getBySport: async (sportId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/sessions?sportId=${sportId}`);
      const data = await res.json();
      return data.data || [];
    } catch (error) {
      console.error("Error fetching sessions by sport:", error);
      return [];
    }
  },
};

export const joinRequestService = {
  getAll: async () => {
    try {
      const res = await fetch(`${API_BASE}/api/join-requests`);
      const data = await res.json();
      return data.data || [];
    } catch (error) {
      console.error("Error fetching join requests:", error);
      return [];
    }
  },
  getByStudent: async (studentId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/join-requests?studentId=${studentId}`);
      const data = await res.json();
      return data.data || [];
    } catch (error) {
      console.error("Error fetching student join requests:", error);
      return [];
    }
  },
  getByCoach: async (coachId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/join-requests?coachId=${coachId}`);
      const data = await res.json();
      return data.data || [];
    } catch (error) {
      console.error("Error fetching coach join requests:", error);
      return [];
    }
  },
};

export const locationService = {
  getAll: async () => {
    try {
      const res = await fetch(`${API_BASE}/api/locations`);
      const data = await res.json();
      return data.data || [];
    } catch (error) {
      console.error("Error fetching locations:", error);
      return [];
    }
  },
};

export const notificationService = {
  getAll: async () => {
    try {
      const res = await fetch(`${API_BASE}/api/notifications`);
      const data = await res.json();
      return data.data || [];
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return [];
    }
  },
};
