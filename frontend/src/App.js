import React from 'react';
import './App.css';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Data from './pages/Data';
import Scaffold from './pages/Scaffold';
import Studies from './pages/Studies'
import Contact from './pages/Contact';

function App() {
  return (
    <div className="App">
      <Navbar />

      <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/data' element={<Data />} />
          <Route path='/grna' element={<Scaffold />} />
          <Route path='/studies' element={<Studies />} />
          <Route path='/contact' element={<Contact />} />
      </Routes>

      <Footer />
    </div>
  );
}

export default App;
