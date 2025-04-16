import React from 'react';
import './App.css';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Data_cas9 from './pages/Data_cas9';
import Data_cas12 from './pages/Data_cas12';
import Scaffold from './pages/Scaffold';
import Studies from './pages/Studies';
import Statistics from './pages/Statistics';
import ActivityGraph from "./pages/ActivityGraph";
import Submit from './pages/Submit';
import Contact from './pages/Contact';

function App() {
  return (
    <div className="App">
      <Navbar />

        <div className="App-container">
            <Routes>
                <Route path='/' element={<Home />} />
                <Route path='/data/cas9' element={<Data_cas9 />} />
                <Route path='/data/cas12' element={<Data_cas12 />} />
                <Route path='/grna' element={<Scaffold />} />
                <Route path='/studies' element={<Studies />} />
                <Route path='/statistics/activity-graph' element={<ActivityGraph />}/>
                <Route path='/statistics/' element={<Statistics />}/>
                <Route path='/submit' element={<Submit />}/>
                <Route path='/contact' element={<Contact />} />
            </Routes>
        </div>


      <Footer />
    </div>
  );
}

export default App;
