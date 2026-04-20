import { useState, useEffect } from 'react';
import axios from 'axios';
// import reactLogo from './assets/react.svg'
// import viteLogo from './assets/vite.svg'
// import heroImg from './assets/hero.png'
import './App.css';



function App() {
  const [data, setData] = useState([])

  const fetchDjango =  async ()=> {
    const res = await axios.get("http://localhost:8000/api/create_view/");
    setData(res.data)
    console.log(res.data)

  }
  useEffect(() =>{
    fetchDjango()
  },[])

  return(
    <>
   {Object.entries(data).map(([key, value]) => (
      <li key={key}>
        <strong>{key}:</strong> {value}
      </li>
    ))}
    </>

  )
}
export default App
