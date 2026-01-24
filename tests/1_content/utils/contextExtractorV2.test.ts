/**
 * Context Extractor V2 Tests
 *
 * Tests for DOM-based context extraction functionality (V2).
 * Combines scenarios from both single-word and fragment tests.
 *
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { extractContextV2 } from '@/1_content/utils/contextExtractorV2';

// ============================================================================ 
// Helper Functions
// ============================================================================ 

/**
 * Helper function to format and print test results for manual inspection.
 */
function formatTestResult(testName: string, result: any, domContent: string) {
    console.log(`\n--- Test Case: ${testName} ---`);
    console.log('DOM Content:\n', domContent.trim());
    console.log('\nExtracted Context:', JSON.stringify(result, null, 2));
    console.log('--------------------------------------\n');
}

/**
 * Helper function to create a DOM structure for testing
 */
function createTestDOM(html: string): HTMLElement {
    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.appendChild(container);
    return container;
}

/**
 * Helper function to create a Range object from text selection
 */
function createRangeFromText(
    container: HTMLElement,
    searchText: string
): Range | null {
    const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null
    );

    let node: Node | null;
    while ((node = walker.nextNode())) {
        const text = node.textContent || '';
        const index = text.indexOf(searchText);

        if (index !== -1) {
            const range = document.createRange();
            range.setStart(node, index);
            range.setEnd(node, index + searchText.length);
            return range;
        }
    }

    return null;
}

/**
 * Clean up DOM after each test
 */
function cleanupDOM(): void {
    document.body.innerHTML = '';
}

// ============================================================================ 
// Test Suite
// ============================================================================ 

describe('contextExtractorV2', () => {
    beforeEach(() => {
        cleanupDOM();
    });

    describe('Basic Scenarios (Single Word)', () => {
        it('should extract context from a simple sentence', () => {
            const testName = 'Simple Sentence';
            const html = '<p>The quick brown fox jumps over the lazy dog.</p>';
            const container = createTestDOM(html);
            const range = createRangeFromText(container, 'fox');
            const context = extractContextV2(range!); 

            formatTestResult(testName, context, html);
            expect(context).not.toBeNull();
            expect(context.text).toBe('fox');
            expect(context.leadingText).toBe('The quick brown ');
            expect(context.trailingText).toBe(' jumps over the lazy dog.');
            expect(context.currentSentence).toBe('The quick brown fox jumps over the lazy dog.');
        });

        it('should extract context with word at sentence beginning', () => {
            const testName = 'Word at Sentence Beginning';
            const html = '<p>Light is essential for life on Earth.</p>';
            const container = createTestDOM(html);
            const range = createRangeFromText(container, 'Light');
            const context = extractContextV2(range!);

            formatTestResult(testName, context, html);
            expect(context).not.toBeNull();
            expect(context.text).toBe('Light');
            expect(context.leadingText).toBe('');
            expect(context.trailingText).toBe(' is essential for life on Earth.');
        });

        it('should extract context with word at sentence end', () => {
            const testName = 'Word at Sentence End';
            const html = '<p>Please turn on the light.</p>';
            const container = createTestDOM(html);
            const range = createRangeFromText(container, 'light');
            const context = extractContextV2(range!);

            formatTestResult(testName, context, html);
            expect(context).not.toBeNull();
            expect(context.text).toBe('light');
            expect(context.leadingText).toBe('Please turn on the ');
            expect(context.trailingText).toBe('.');
        });
    });

    describe('Fragment Scenarios', () => {
        it('should extract context for a simple fragment in the middle of a sentence', () => {
            const testName = 'Simple Fragment in Middle';
            const html = '<p>The quick brown fox jumps over the lazy dog.</p>';
            const selectedText = 'brown fox jumps';
            const container = createTestDOM(html);
            const range = createRangeFromText(container, selectedText);
            const context = extractContextV2(range!);

            formatTestResult(testName, context, html);
            expect(context).not.toBeNull();
            expect(context.text).toBe(selectedText);
            expect(context.leadingText).toBe('The quick ');
            expect(context.trailingText).toBe(' over the lazy dog.');
        });

        it('should handle a fragment that spans across inline formatting elements', () => {
            const testName = 'Fragment Spanning Inline Elements';
            const html = '<p>She is a <strong>very talented</strong> and <em>highly skilled</em> developer.</p>';
            
            const container = createTestDOM(html);
            const strongNode = container.querySelector('strong')?.firstChild;
            const emNode = container.querySelector('em')?.firstChild;
            
            if (!strongNode || !emNode) throw new Error('Test setup failed: strong or em not found');

            const range = document.createRange();
            range.setStart(strongNode, 0);
            range.setEnd(emNode, emNode.textContent!.length);
            
            const context = extractContextV2(range);

            formatTestResult(testName, context, html);
            expect(context).not.toBeNull();
            expect(context.text).toBe('very talented and highly skilled');
            expect(context.leadingText).toBe('She is a ');
            expect(context.trailingText).toBe(' developer.');
        });

        it('should extract context for a fragment at the end of a sentence', () => {
            const testName = 'Fragment at Sentence End';
            const html = '<p>This sentence ends with the selected part.</p>';
            const selectedText = 'the selected part.';
            const container = createTestDOM(html);
            const range = createRangeFromText(container, selectedText);
            const context = extractContextV2(range!);

            formatTestResult(testName, context, html);
            expect(context).not.toBeNull();
            expect(context.text).toBe(selectedText);
            expect(context.leadingText).toBe('This sentence ends with ');
            expect(context.trailingText).toBe('');
        });
    });

    describe('Multiple Sentences & Boundaries', () => {
        it('should extract previous and next sentences', () => {
            const testName = 'Previous and Next Sentences';
            const html = `
                <p>
                    First sentence is here. 
                    The quick brown fox jumps over the lazy dog. 
                    Third sentence comes last.
                </p>
            `;
            const container = createTestDOM(html);
            const range = createRangeFromText(container, 'fox');
            const context = extractContextV2(range!);

            formatTestResult(testName, context, html);
            expect(context).not.toBeNull();
            expect(context.text).toBe('fox');
            expect(context.previousSentences).toEqual(['First sentence is here.']);
            expect(context.nextSentences).toEqual(['Third sentence comes last.']);
        });

        it('should respect paragraph boundaries', () => {
            const testName = 'Paragraph Boundaries';
            const html = `
                <div>
                    <p>First paragraph with some text.</p>
                    <p>Second paragraph contains the word light here.</p>
                    <p>Third paragraph with more content.</p>
                </div>
            `;
            const container = createTestDOM(html);
            const range = createRangeFromText(container, 'light');
            const context = extractContextV2(range!);

            formatTestResult(testName, context, html);
            expect(context).not.toBeNull();
            expect(context.text).toBe('light');
            expect(context.previousSentences).toEqual([]);
            expect(context.nextSentences).toEqual([]);
            expect(context.currentSentence).toBe('Second paragraph contains the word light here.');
        });

        it('should stop at heading boundaries', () => {
            const testName = 'Heading Boundaries';
            const html = `
                <div>
                    <h2>Section Title</h2>
                    <p>This paragraph contains the word light.</p>
                </div>
            `;
            const container = createTestDOM(html);
            const range = createRangeFromText(container, 'light');
            const context = extractContextV2(range!);

            formatTestResult(testName, context, html);
            expect(context).not.toBeNull();
            expect(context.previousSentences).toEqual([]);
        });

        it('should handle list items as boundaries', () => {
            const testName = 'List Items';
            const html = `
                <ul>
                    <li>First item.</li>
                    <li>The light is important here.</li>
                    <li>Third item.</li>
                </ul>
            `;
            const container = createTestDOM(html);
            const range = createRangeFromText(container, 'light');
            const context = extractContextV2(range!);

            formatTestResult(testName, context, html);
            expect(context).not.toBeNull();
            expect(context.text).toBe('light');
            expect(context.previousSentences).toEqual([]);
            expect(context.nextSentences).toEqual([]);
        });
    });

    describe('Special Punctuation', () => {
        it('should handle Chinese punctuation', () => {
            const testName = 'Chinese Punctuation';
            const html = '<p>这是第一句。这里有一个light单词。这是第三句。</p>';
            const container = createTestDOM(html);
            const range = createRangeFromText(container, 'light');
            const context = extractContextV2(range!);

            formatTestResult(testName, context, html);
            expect(context).not.toBeNull();
            expect(context.text).toBe('light');
            expect(context.leadingText).toBe('这里有一个');
            expect(context.previousSentences).toEqual(['这是第一句。']);
            expect(context.nextSentences).toEqual(['这是第三句。']);
        });

        it('should handle question marks', () => {
            const testName = 'Question Marks';
            const html =
                '<p>What is that? The light is bright. Do you see it?</p>';
            const container = createTestDOM(html);
            const range = createRangeFromText(container, 'light');
            const context = extractContextV2(range!);

            formatTestResult(testName, context, html);
            expect(context).not.toBeNull();
            expect(context.previousSentences).toEqual(['What is that?']);
            expect(context.nextSentences).toEqual(['Do you see it?']);
        });
    });

    describe('Edge Cases', () => {
        it('should handle single word in paragraph', () => {
            const testName = 'Single Word in Paragraph';
            const html = '<p>light</p>';
            const container = createTestDOM(html);
            const range = createRangeFromText(container, 'light');
            const context = extractContextV2(range!);

            formatTestResult(testName, context, html);
            expect(context).not.toBeNull();
            expect(context.text).toBe('light');
            expect(context.leadingText).toBe('');
            expect(context.trailingText).toBe('');
            expect(context.currentSentence).toBe('light');
        });

        it('should handle invalid range gracefully', () => {
            const testName = 'Invalid Range';
            const html = '<p>Some text</p>';
            createTestDOM(html);
            const range = document.createRange();
            range.setStart(document.body, 0);
            range.setEnd(document.body, 0);
            const context = extractContextV2(range);

            formatTestResult(testName, context, html);
            // Should return a minimal context object
            expect(context).toEqual({
                text: '',
                leadingText: '',
                trailingText: '',
                currentSentence: '',
                previousSentences: [],
                nextSentences: [],
            });
        });
    });

    describe('Real-World Scenarios with Ignored Elements', () => {
        it('should correctly extract context when previous sentences contain translated words (spans)', () => {
            const testName = 'Previous sentence contains translated span';
            const html = `<p data-ries-data-process="62" class="translation-text-wrapper" data-group-id="group-62">This is quite good, but as mentioned you need to take this metric with a <span class="ai-translator-anchor" id="translation-anchor-2" style="cursor: pointer;">grain<div class="ai-translator-tooltip visible" style="font-size: 9px;">一点</div></span> of salt. It would be better if we could evaluate our model by <span class="ai-translator-anchor" id="translation-anchor-0" style="cursor: pointer;">running<div class="ai-translator-tooltip visible" style="font-size: 9px;">运行</div></span> the qureies against a real database and compare the results. Since there <span class="ai-translator-anchor" id="translation-anchor-1" style="cursor: pointer;">might<div class="ai-translator-tooltip visible" style="font-size: 9px;">可能</div></span> be different "correct" SQL queries for the same instruction. There are also several ways on how we could improve the performance by using few-shot learning, using RAG, Self-healing to generate the SQL query.</p>`;
            const selectedText = 'evaluate our model';
            const container = createTestDOM(html);
            const range = createRangeFromText(container, selectedText);
            const context = extractContextV2(range!);

            formatTestResult(testName, context, html);
            expect(context).not.toBeNull();
            expect(context.text).toBe(selectedText);
            expect(context.leadingText).toBe(' It would be better if we could ');
            expect(context.trailingText).toBe(' by running the qureies against a real database and compare the results.');
            expect(context.previousSentences).toEqual(['This is quite good, but as mentioned you need to take this metric with a grain of salt.']);
        });
    });

    describe('Complex DOM Structures', () => {
        it('should handle selection inside deeply nested inline elements', () => {
            const testName = 'Deeply Nested Inline Elements';
            const html = `<p>Sentence one. <span>Here is <b>a <i>deeply</i> nested</b> word.</span> Sentence three.</p>`;
            const container = createTestDOM(html);
            const range = createRangeFromText(container, 'nested');
            const context = extractContextV2(range!);

            formatTestResult(testName, context, html);
            expect(context.text).toBe('nested');
            expect(context.leadingText).toBe(' Here is a deeply ');
            expect(context.trailingText).toBe(' word.');
            expect(context.currentSentence).toBe('Here is a deeply nested word.');
            expect(context.previousSentences).toEqual(['Sentence one.']);
            expect(context.nextSentences).toEqual(['Sentence three.']);
        });

        it('should handle selection spanning multiple text nodes within one block', () => {
            const testName = 'Selection Spanning Multiple Text Nodes';
            const html = `<p>This is the <span>first part</span>, and this is the <span>second part</span>.</p>`;
            const container = createTestDOM(html);
            
            const firstNode = container.querySelector('span')!.nextSibling!;
            const secondNode = container.querySelectorAll('span')[1]!.firstChild!;

            const range = document.createRange();
            range.setStart(firstNode, 2); // Starts at ", and this is the "
            range.setEnd(secondNode, 6); // Ends at "second"

            const context = extractContextV2(range);
            
            formatTestResult(testName, context, html);
            expect(context.text).toBe('and this is the second');
            expect(context.leadingText).toBe('This is the first part, ');
            expect(context.trailingText).toBe(' part.');
            expect(context.currentSentence).toBe('This is the first part, and this is the second part.');
        });

        it('should handle complex whitespace and newlines correctly', () => {
            const testName = 'Complex Whitespace and Newlines';
            const html = `
                <p>
                    First sentence.
                    Here is a sentence   with lots of
                    whitespace.
                    Third sentence.
                </p>`;
            const container = createTestDOM(html);
            const range = createRangeFromText(container, 'sentence   with');
            const context = extractContextV2(range!);

            formatTestResult(testName, context, html);
            expect(context.text).toBe('sentence   with');
            expect(context.leadingText).toBe(' Here is a ');
            expect(context.trailingText).toBe(' lots of whitespace.');
            expect(context.currentSentence).toBe('Here is a sentence with lots of whitespace.');
            expect(context.previousSentences).toEqual(['First sentence.']);
            expect(context.nextSentences).toEqual(['Third sentence.']);
        });

        it('should not cross a custom boundary tag', () => {
            const testName = 'Custom Boundary Tag';
            const html = `
                <article>
                    <header>Previous sentence.</header>
                    <section>The main sentence is here.</section>
                    <footer>Next sentence.</footer>
                </article>`;
            const container = createTestDOM(html);
            const range = createRangeFromText(container, 'main sentence');
            const context = extractContextV2(range!, { boundaryTags: ['SECTION'] });

            formatTestResult(testName, context, html);
            expect(context.currentSentence).toBe('The main sentence is here.');
            expect(context.previousSentences).toEqual([]);
            expect(context.nextSentences).toEqual([]);
        });

        it('should handle selection spanning across a block boundary', () => {
            const testName = 'Selection Spanning Block Boundary';
            const html = `<div><p>First part of selection.</p><p>Second part of selection.</p></div>`;
            const container = createTestDOM(html);

            const p1 = container.querySelector('p:first-child')!.firstChild!;
            const p2 = container.querySelector('p:last-child')!.firstChild!;
            
            const range = document.createRange();
            range.setStart(p1, 0);
            range.setEnd(p2, p2.textContent!.length);

            const context = extractContextV2(range);

            formatTestResult(testName, context, html);
            // The common ancestor is the DIV. The extractor should treat the entire content as a single scope.
            expect(context.text).toBe('First part of selection.Second part of selection.');
            expect(context.currentSentence).toBe('First part of selection.Second part of selection.');
            expect(context.previousSentences).toEqual([]);
            expect(context.nextSentences).toEqual([]);
        });

        it('should correctly use custom sentence terminators', () => {
            const testName = 'Custom Sentence Terminators';
            const html = `<p>Sentence one|Sentence two;the selected one|Sentence four</p>`;
            const container = createTestDOM(html);
            const range = createRangeFromText(container, 'selected one');
            const context = extractContextV2(range!, { terminators: ['|', ';'] });

            formatTestResult(testName, context, html);
            expect(context.currentSentence).toBe('the selected one|');
            expect(context.previousSentences).toEqual(['Sentence two;']);
            expect(context.nextSentences).toEqual(['Sentence four']);
        });

        it('should return multiple previous/next sentences when requested', () => {
            const testName = 'Multiple Previous/Next Sentences';
            const html = `<p>Sentence 1. Sentence 2. Sentence 3. The selected sentence. Sentence 5. Sentence 6. Sentence 7.</p>`;
            const container = createTestDOM(html);
            const range = createRangeFromText(container, 'selected sentence');
            const context = extractContextV2(range!, { prevCount: 2, nextCount: 3 });

            formatTestResult(testName, context, html);
            expect(context.previousSentences).toEqual(['Sentence 2.', 'Sentence 3.']);
            expect(context.nextSentences).toEqual(['Sentence 5.', 'Sentence 6.', 'Sentence 7.']);
        });
    });

    describe("Regression Tests", () => {
        it("should respect block boundaries between sibling elements (e.g. H1 and SPAN)", () => {
            const testName = "H1 and Span Merge Bug"
            const html = `
                <div>
                    <h1>Run Curl Commands Online</h1>
                    <span>Run Curl commands directly in your browser.</span>
                </div>
            `
            const container = createTestDOM(html)
            const range = createRangeFromText(container, "directly")
            const context = extractContextV2(range!)

            formatTestResult(testName, context, html)

            // Expected behavior (Fix):
            // The current sentence should ONLY be the content of the span (or starting from span).
            // It should NOT include the H1 text.
            expect(context.currentSentence).toBe("Run Curl commands directly in your browser.")
        })
    })
});
