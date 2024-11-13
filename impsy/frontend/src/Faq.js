import React, { useState } from 'react';
import styled from 'styled-components';

const FAQContainer = styled.div`
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
`;

const Question = styled.div`
    margin: 10px 0;
    padding: 15px 20px;
    background-color: #ffffff;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    cursor: pointer;
    width: 100%;
    max-width: 600px;
    font-size: 12px;
    transition: all 0.3s ease;

    &:hover {
        background-color: #f0f0f0;
        transform: translateY(-2px);
        box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
    }
`;

const Answer = styled.div`
    background-color: #e9e4f0;
    padding: ${props => (props.isOpen ? "10px 20px" : "0 20px")};
    margin-top: 5px;
    border-radius: 8px;
    font-size: 12px;
    overflow: hidden;
    max-height: ${props => (props.isOpen ? "1000px" : "0")};
    transition: all 0.2s ease;
    transition-property: max-height, padding;
`;

function FAQ() {
    const [activeIndex, setActiveIndex] = useState(null);

    const faqs = [
        {
            question: 'What services does IMPSY offer?',
            answer: 'IMPSY offers a MDRNN machine learning model that could do real-time music.'
        },
        {
            question: 'How can I access IMPSY tools?',
            answer: 'Our tools are available online and can be accessed through our website.'
        },
        {
            question: 'Is there a fee to use IMPSY?',
            answer: 'Completely Free at the moment, Woo Hoo!'
        }
    ];

    const toggleFAQ = index => {
        setActiveIndex(index === activeIndex ? null : index);
    };

    return (
        <FAQContainer>
            <h1>Frequently Asked Questions</h1>
            {faqs.map((faq, index) => (
                <Question key={index} onClick={() => toggleFAQ(index)}>
                    <h2>{faq.question}</h2>
                    <Answer isOpen={activeIndex === index}>{faq.answer}</Answer>
                </Question>
            ))}
        </FAQContainer>
    );
}

export default FAQ;
