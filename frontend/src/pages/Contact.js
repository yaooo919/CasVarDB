import React from 'react';
import './Contact.css';
import jeffreyAvatar from '../assets/notion-avatar-jeffrey.png';
import jeffreyAvatarHover from '../assets/jeffrey.jpg';
import yongyaoAvatar from '../assets/notion-avatar-yongyao.png';
import yongyaoAvatarHover from '../assets/yongyao.jpg';
import peterAvatar from '../assets/notion-avatar-peter.png';
import peterAvatarHover from '../assets/peter.jpg';

function Contact() {
    const handleHover = (e, hoverSrc, originalSrc) => {
        e.target.src = hoverSrc;
        e.target.addEventListener('mouseleave', () => {
            e.target.src = originalSrc;
        }, { once: true });
    };

    return (
        <div>
            <div className="contact-page">
                <div className="contact-card">
                    <div className="avatar-wrapper">
                        <img
                            src={jeffreyAvatar}
                            alt="Jeffrey's notion avatar"
                            className="avatar"
                            onMouseEnter={(e) => handleHover(e, jeffreyAvatarHover, jeffreyAvatar)}
                        />
                    </div>
                    <p className="contact-info">
                        <strong>Jeffrey Mak</strong><br />
                        DPhil Student at the University of Oxford<br />
                        <div className='email'>
                            <i class="bi bi-envelope"></i>
                            <a href='mailto:jeffrey.mak@keble.ox.ac.uk'>jeffrey.mak@keble.ox.ac.uk</a>
                        </div>
                    </p>
                </div>
                <div className="contact-card">
                    <div className="avatar-wrapper">
                        <img
                            src={yongyaoAvatar}
                            alt="Yongyao's notion avatar"
                            className="avatar"
                            data-hover={yongyaoAvatarHover}
                            onMouseEnter={(e) => handleHover(e, yongyaoAvatarHover, yongyaoAvatar)}
                        />
                    </div>
                    <p className="contact-info">
                        <strong>Yongyao Mo</strong><br />
                        DPhil Student at the University of Oxford<br />
                        <div className='email'>
                            <i class="bi bi-envelope"></i>
                            <a href='mailto:yongyao.mo@stcatz.ox.ac.uk'>yongyao.mo@stcatz.ox.ac.uk</a>
                        </div>
                    </p>
                </div>
                <div className="contact-card">
                    <div className="avatar-wrapper">
                        <img
                            src={peterAvatar}
                            alt="Peter's notion avatar"
                            className="avatar"
                            data-hover={peterAvatarHover}
                            onMouseEnter={(e) => handleHover(e, peterAvatarHover, peterAvatar)}
                        />
                    </div>
                    <p className="contact-info">
                        <strong>Peter Minary</strong><br />
                        Research Lecturer in Computational Biology<br />
                        <div className='email'>
                            <i class="bi bi-envelope"></i>
                            <a href='mailto:peter.minary@cs.ox.ac.uk'>peter.minary@cs.ox.ac.uk</a>
                        </div>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Contact;
