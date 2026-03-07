import axios from "axios";

const axiosInstance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_SERVER_URI,
    withCredentials: true, 
})

let isRefreshing = false;
let refreshSubscribers: (() => void)[] = [];

const handleLogout = () => {
    if (window.location.pathname !== '/login') {
        window.location.href = '/login';
    }
}

const subscribeToRefreshToken = (callback: ()=>void) =>{
    refreshSubscribers.push(callback);
}

const onRefreshSuccess = () => {
    refreshSubscribers.forEach(callback => callback());
    refreshSubscribers = [];
}  


axiosInstance.interceptors.request.use(
    (config) => config, 
    (error) => Promise.reject(error)
)

axiosInstance.interceptors.response.use(
    (response) => response, 
    async (error) => {
        // get the request config
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry ){
            try {
                if(isRefreshing){
                    return new Promise((resolve)=>{
                        return subscribeToRefreshToken(()=> resolve(axiosInstance(originalRequest)))
                    })
                }

                isRefreshing = true;
                originalRequest._retry = true;
                await axios.post(`${process.env.NEXT_PUBLIC_SERVER_URI}/api/refresh-token-user`, 
                    {},
                    {
                        withCredentials: true,
                    }
                )

                isRefreshing = false;
                onRefreshSuccess();

                return axiosInstance(originalRequest);
            }
            catch(e){
                isRefreshing = false;
                refreshSubscribers = [];
                handleLogout();
                return Promise.reject(error)
            }
        }
        return Promise.reject(error)
})


export default axiosInstance;