import { calculateImageScore } from './services/internetSearch.js';

const targetName = "Pankaj Rathod";
const contextKeywords = ["actor", "business", "profile"];

const items = [
    {
        title: "Film Quarterly, Volume 41, Number 1",
        link: "https://online.ucpress.edu/fq/article/41/1/2/38584/Film-Quarterly-Volume-41-Number-1-Fall-1987",
        imageUrl: "https://online.ucpress.edu/Document/41/1/2/38584/fq_41_1.jpg",
        imageWidth: 300,
        imageHeight: 450
    },
    {
        title: "PIXAR'S 22 RULES OF STORY - ANALYZED",
        link: "https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.slideshare.net%2Fstephanvladimirovich%2Fpixars-22-rules-of-story-analyzed&psig=AOvVaw0...",
        imageUrl: "https://image.slidesharecdn.com/pixars22rulesofstoryanalyzed-111101123456-phpapp01/95/pixars-22-rules-of-story-analyzed-1-728.jpg",
        imageWidth: 728,
        imageHeight: 1030
    },
    {
        title: "Census of India 1971 - Mysore",
        link: "https://archive.org/details/censusofindia1971mysore",
        imageUrl: "https://archive.org/services/img/censusofindia1971mysore",
        imageWidth: 400,
        imageHeight: 600
    },
    {
        title: "Pankaj Rathod - LinkedIn Profile",
        link: "https://www.linkedin.com/in/pankaj-rathod-123456",
        imageUrl: "https://media.licdn.com/dms/image/C4D03AQH...",
        imageWidth: 200,
        imageHeight: 200
    },
    {
        title: "Pankaj Rathod headshot",
        link: "https://www.pankajrathod.com/photos/headshot.jpg",
        imageUrl: "https://www.pankajrathod.com/photos/headshot.jpg",
        imageWidth: 500,
        imageHeight: 600
    }
];

console.log(`Target: ${targetName}\n`);

items.forEach(item => {
    const score = calculateImageScore(item, targetName, contextKeywords);
    console.log(`Title: ${item.title}`);
    console.log(`URL:   ${item.link.substring(0, 50)}...`);
    console.log(`Score: ${score}`);
    console.log(`Status: ${score >= 10 ? '✅ PASSED' : '❌ FILTERED'}`);
    console.log('-------------------');
});
