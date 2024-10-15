

const MODE = process.env.NODE_ENV;

const sendGoogleSdkCommand = async (prompt) => {
    const API_URL = localStorage.getItem('home_assistant_url');
    const API_KEY = localStorage.getItem('ha_api_key');
    if (prompt.includes('\n')) {
        prompt = prompt.split('\n')[0];
    }
    try {
        const url = API_URL + "/api/services/google_assistant_sdk/send_text_command";
        const headers = {
            Authorization: `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
        };
        const data = {
            command: prompt,
        };
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data),
        });
        if (MODE === 'development') {
            console.log("Google Assistant SDK Command:", prompt);
        }
    } catch (error) {
        console.error('Error sending Google Assistant SDK command:', error);
        throw error;
    }
};

const sendPushCamera = async (cameraName) => {
    try {
        const state = { state: new Date().toISOString() };
        if (cameraName.includes('camera1')) {
            await updateState('input_button.send_camera_push', state);
        } else if (cameraName.includes('camera2')) {
            await updateState('input_button.send_camera2_push', state);
        }
    } catch (error) {
        console.error('Error sending camera push:', error);
        throw error;
    }
};

const getHaServices = async (services = null, states = null) => {
    const API_URL = localStorage.getItem('home_assistant_url');
    const API_KEY = localStorage.getItem('ha_api_key');
    try {
        const endpoint = services ? 'services' : states ? 'states' : 'services';
        const url = `${API_URL}${endpoint}`;
        const headers = {
            Authorization: `Bearer ${API_KEY}`,
        };
        const response = await fetch(url, {
            method: 'GET',
            headers: headers,
        });
        return response.json();
    } catch (error) {
        console.error('Error getting HA services:', error);
        throw error;
    }
};

const getForecast = async () => {
    try {
        const services = await getHaServices(true, true);
        let forecastId = null;
        services.forEach((service, index) => {
            if (service.entity_id.includes('forecast')) {
                forecastId = index;
                console.log(`Found and saved HA Forecast State ID: ${service.entity_id}`);
            }
        });
        if (forecastId === null) {
            console.log('No HA weather forecast state found...');
            return null;
        }
        const forecastObj = services[forecastId];
        return forecastObj;
    } catch (error) {
        console.error('Error getting forecast:', error);
        throw error;
    }
};

const updateState = async (entityId, data) => {
    const API_URL = localStorage.getItem('home_assistant_url');
    const API_KEY = localStorage.getItem('ha_api_key');
    try {
        const url = `${API_URL}states/${entityId}`;
        const headers = {
            Authorization: `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
        };
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data),
        });
        return response.json();
    } catch (error) {
        console.error(`Error updating state for ${entityId}:`, error);
        throw error;
    }
};

export {
    sendGoogleSdkCommand,
    sendPushCamera,
    getHaServices,
    getForecast,
    updateState,
};