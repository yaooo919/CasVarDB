import React from "react";
import "./Contact.css";
import jeffreyAvatar from "../assets/jeffrey.jpg";
import yongyaoAvatar from "../assets/yongyao.jpg";
import peterAvatar from "../assets/peter.jpg";

function Contact() {
  return (
    <div>
      <div className="header-container">
        <div className="header">
          <h1>Contact</h1>
        </div>
      </div>
      <div className="contact-page">
        <div className="contact-card">
          <div className="avatar-wrapper">
            <img
              src={jeffreyAvatar}
              alt="Jeffrey's avatar"
              className="avatar"
            />
          </div>
          <p className="contact-info">
            <strong>Jeffrey Mak</strong><br />
            DPhil Student at the University of Oxford<br />
            <div className="email">
              <i className="bi bi-envelope"></i>
              <a href="mailto:jeffrey.mak@keble.ox.ac.uk">jeffrey.mak@keble.ox.ac.uk</a>
            </div>
          </p>
        </div>
        <div className="contact-card">
          <div className="avatar-wrapper">
            <img
              src={yongyaoAvatar}
              alt="Yongyao's avatar"
              className="avatar"
              data-hover={yongyaoAvatar}
            />
          </div>
          <p className="contact-info">
            <strong>Yongyao Mo</strong><br />
            DPhil Student at the University of Oxford<br />
            <div className="email">
              <i className="bi bi-envelope"></i>
              <a href="mailto:yongyao.mo@stcatz.ox.ac.uk">yongyao.mo@stcatz.ox.ac.uk</a>
            </div>
          </p>
        </div>
        <div className="contact-card">
          <div className="avatar-wrapper">
            <img
              src={peterAvatar}
              alt="Peter's avatar"
              className="avatar"
              data-hover={peterAvatar}
            />
          </div>
          <p className="contact-info">
            <strong>Peter Minary</strong><br />
            Research Lecturer in Computational Biology<br />
            <div className="email">
              <i className="bi bi-envelope"></i>
              <a href="mailto:peter.minary@cs.ox.ac.uk">peter.minary@cs.ox.ac.uk</a>
            </div>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Contact;
