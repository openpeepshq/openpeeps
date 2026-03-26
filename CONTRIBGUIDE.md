## **OpenPeeps Contributor Guide**

Anyone is able to contribute to OpenPeeps, from veteran developers to first time users. Here is a list of ways you can help out! If you're looking to make contributions, please consult the following guidelines. **For any questions, bug reports, documentation requests, or other developer needs, contact AllPeeP Developer relations at openpeeps-dev@allpeep.com** 

### Making a Bug Report

If you encounter a bug while using the software, please send a report to DevRel, including:  

- How the bug impacted functionality  
- What happened directly prior/steps for replication  
- The operating system/platform the bug occurred on  
- If you are an end user accessing via browser, which browser you were using  
- Error messages/codes (if any)  
- Screenshots of the bug, if possible  
- Page URL, if applicable

### Contributing to Documentation 

#### End-User Documentation

The end-user product wiki can be found at (WIKI LINK TBA). This wiki is closed to public edits. However should you encounter information that is unclear, out of date, or outright missing, please contact DevRel with a request for the passage to be revised. The report should include:

1. What passage(s) need clarification
2. What information is unclear, missing, or incorrect.

#### Developer Documentation

The OpenPeeps developer wiki is open for anyone to edit, and can be found [here](https://codeberg.org/openpeeps/openpeeps/wiki). In order to make an edit:

1. Create a free account and log in  
2. Make your proposed edit
3. Await feedback from other editors

Please ensure your contributions are factually and grammatically correct before submitting. Repeated erroneous edits, spam, or otherwise engaging with the wiki in bad faith may result in a restriction of editing permissions. Please do not directly submit AI generated text in your edits.  

### Code Contributions

If you are interested in making contributions to the OpenPeeps codebase itself, **please email DevRel to request access to the OpenPeeps Developer Community.** There, you will be able to talk to maintainers and other contributors regarding needed bugfixes, desired features, and will be able to discuss your proposed additions with the community.

#### Bugfixing

If you're looking to start bugfixing, you can either search the [OpenPeeps issues board](https://codeberg.org/openpeeps/openpeeps/issues/new) for an unaddressed bug, or address one that you encounter yourself. **In the later case,** you should first contact DevRel to confirm that the bug is in fact unintended behavior, and then consult the [repository issues board](https://codeberg.org/openpeeps/openpeeps/issues/new) to ensure that the bug is not already being addressed. Once you have indentified a bug, you are ready to do the following:  

1. Mark the issue as in progress  
2. Create your own fork and clone it to your local device  
3. Work on your local repository until the bug is fixed, performing thorough tests to ensure you have a robust fix
4. Push your changes to your remote repository and open a pull request as a draft  
5. Write a detailed description for the PR, including the bug it's addressing, tests you performed, as well as any potential vulnerabilities or edge cases  
6. Ensure there are no merge conflicts  
7. Unmark the pull request as a draft and await feedback from maintainers

#### Feature Additions

**Before beginning work on feature additions/changes intended for the OpenPeeps main branch,** you should do the following:  

1. Check the [repository issues board](https://codeberg.org/openpeeps/openpeeps/issues/new) and Feature Proposal group in the OpenPeep Development Community to ensure that the a similar feature is not already being developed  
2. Make a post in the Feature Proposal group to gauge interest from OpenPeeps maintainers
3. Gauge interest from other developers/users

Afterwards, if both maintainers and the wider community are interested in the proposed changes, you are ready to do the following:  

1. Create an issue on the issue board and mark it as in progress  
2. Create your own fork and clone it to your local device  
3. Work on your local repository, making periodic commits to your remote as features are completed and bugs are ironed out  
4. Stress test the new feature(s) to the best of your ability to ensure the changes aren't breaking  
5. Open a draft pull request  
6. Write a detailed description for the PR, including the feature(s) it's adding, tests you performed, as well as any known vulnerabilities or edge cases  
7. Ensure there are no merge conflicts  
8. Unmark the pull request as a draft and await feedback from maintainers

If the maintainers don't wish for the changes to be incorporated into the main branch, but there is significant community interest, you should consider developing the feature as a plugin.