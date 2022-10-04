import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import Image from 'next/image';
import Link from 'next/link';

const Blog = ({ posts }) => {

    console.log(posts)

    return (
        <div>
            <h1>Nos merveilleux articles</h1>
            {posts.map(post => (
                <div style={{ backgroundColor: 'rebeccapurple', width: '20rem', height: '20rem'}} key={Math.random()}>
                    <h3>{post.frontmatter.title} par {post.frontmatter.author}</h3>
                    <Image src={post.frontmatter.featured_img} height={210} width={210}/>
                    <Link href={`/blog/${post.slug}`} >
                        <a style={{ color: 'white'}}>Voir l'article</a>
                    </Link>
                </div>
            ))}
        </div>
    )
};

export default Blog;

export async function getStaticProps() {

    const files = fs.readdirSync(path.join('posts')) 
    //get files in posts dir
    
    const posts = files.map(filename => {
        //create slug based on filename
        const slug = filename.replace('.md', '');

        //get frontmatter md recap
        const markdownMeta = fs.readFileSync(path.join('posts', filename), 'utf-8')
        console.log(markdownMeta)
        
        const { data: frontmatter } = matter(markdownMeta);

        return {
            slug,
            frontmatter
        }
    });

    return {
        props: {
            posts,
        }
    }
}