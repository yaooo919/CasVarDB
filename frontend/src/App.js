import React from 'react';
import './App.css';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Data from './pages/Data';
import Contact from './pages/Contact';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Scaffold from './pages/Scaffold';

function App() {
  return (
    <div className="App">
      <Navbar />

      <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/data' element={<Data />} />
          <Route path='/grna' element={<Scaffold />} />
          <Route path='/contact' element={<Contact />} />
      </Routes>

      <Footer />
    </div>
  );
}

export default App;
