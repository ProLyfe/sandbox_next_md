import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import {marked} from 'marked'
import Link from 'next/link';
import Image from 'next/image';
import styles from '../../styles/posts.module.css';

const Post = ({ frontmatter, slug, content }) => {
    return (
        <>
        <h1>{frontmatter.title}</h1>
        <Image src={frontmatter.featured_img} height={210} width={210}/>
        <div>
            <div className={styles.markDownContent} dangerouslySetInnerHTML={{ __html: marked(content)}}></div>
        </div>
        </>
    );
};

export default Post;

export async function getStaticPaths() {
    const files = fs.readdirSync(path.join('posts'));

    const paths = files.map(filename => ({
        params: {
            slug: filename.replace('.md', '')
        }
    }))

    return {
        paths: paths,
        fallback: false //404 not found si la page n'existe pas
    }
}

export async function getStaticProps({ params: {slug}}) {

    const markdownMeta = fs.readFileSync(path.join('posts', slug + '.md'), 'utf-8')

    const { data: frontmatter, content } = matter(markdownMeta)

    return {
        props: {
            frontmatter,
            slug,
            content,
        }
    }
}